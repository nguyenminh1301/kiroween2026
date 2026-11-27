// Act 1 start-up: seated body, ambience, interactables, sighting, the launch and TLI timelines
// and the stage machine. Everything goes through cleanup helpers, so unloading removes it.
import { audio, radio, startAudioSession } from '../../audio'
import { CHECKLISTS } from '../../content/checklists'
import { completeAct } from '../../engine/actFlow'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { createBody } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { registerInteractable } from '../../interaction/interactables'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { showHint } from '../../ui/hints'
import {
  BODY_POS,
  DSKY_POS,
  DSKY_RADIUS,
  START_PITCH,
} from '../../procgen/cabin/layout'
import { setCameraShaker } from '../../engine/cameraShake'
import { launchEnvelope, shakeSample, tliEnvelope } from './shake'
import { createStages } from './stages'
import { cabinState } from '../../procgen/cabin/cabinState'
import { act1State, resetAct1State } from './state'
import {
  alarmOn,
  engineLevel,
  LAUNCH_DURATION,
  LAUNCH_SHOTS,
  launchEvents,
  launchViewAt,
  TLI_DURATION,
  TLI_SHOTS,
  tliEngineLevel,
  tliEvents,
  tliViewAt,
} from './timelines'

export function startAct1(): void {
  resetAct1State()
  setPlayerBody(createBody({ pos: { ...BODY_POS }, yaw: 0, pitch: START_PITCH, mode: 'seated' }))
  gameStore.getState().setMoveMode('seated')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
    gameStore.getState().setFear(0)
  })

  addPlayerSystem({ boxes: [], seatForwardYaw: 0 })
  startAudioSession()
  audio.setScene({ hum: 0.6, bed: 'ship', breath: false })
  gameStore.getState().setFear(0.05)
  gameStore.getState().setHeartRate(84)

  const stages = createStages()
  setCameraShaker(() => {
    const { phase, launchT, tliT } = act1State
    if (phase === 'idle') return null
    const t = phase === 'launch' ? launchT : tliT
    const env = phase === 'launch' ? launchEnvelope(t) : tliEnvelope(t)
    return shakeSample(env, t, gameStore.getState().settings.reducedMotion)
  })

  const say = (id: string, opts: { urgent?: boolean; onStart?: () => void } = {}, done: () => void = () => {}): void => {
    void radio.say(id, { urgent: opts.urgent, onStart: opts.onStart }).then(() => {
      if (alive) done()
    })
  }
  const setObjective = (key: 'act1Key' | null): void =>
    gameStore.getState().setObjective(key ? CHECKLISTS[key] : null)
  const syncDsky = (): void => {
    cabinState.dsky = stages.dsky()
    cabinState.dskyVersion++
  }

  // TLI, then the Earth in the windows, then hand-off.
  function startTli(): void {
    act1State.phase = 'tli'
    say('act1.tli', {}, () => {
      new TimelinePlayer({
        duration: TLI_DURATION,
        shots: TLI_SHOTS,
        events: tliEvents({
          playSound: (n) => audio.play(n),
          showEarth: () => {
            cabinState.earth = true
          },
          earthLines: () =>
            say('act1.earth', {}, () =>
              say('act1.look', {}, () =>
                say('act1.rest', {}, () => {
                  stages.tliDone()
                  completeAct()
                }),
              ),
            ),
        }),
        onTick(t) {
          act1State.tliT = t
          act1State.view = tliViewAt(t)
          cabinState.engine = tliEngineLevel(t)
        },
      }).start()
    })
  }

  function onLaunchEnd(): void {
    if (!stages.launchDone()) return
    act1State.view = 'cabin'
    say('act1.key', {
      onStart: () => {
        setObjective('act1Key')
        void showHint('use')
      },
    })
  }

  new TimelinePlayer({
    duration: LAUNCH_DURATION,
    shots: LAUNCH_SHOTS,
    events: [
      ...launchEvents({
        say: (id, opts) => say(id, opts),
        playSound: (n) => audio.play(n),
        ignite: () => {
          act1State.ignited = true
        },
        liftoff: () => {},
        setSky: (c) => {
          cabinState.sky = c
        },
        moment: (id) => gameStore.getState().addAnomalySeen(id),
      }),
      { at: LAUNCH_DURATION, run: onLaunchEnd },
    ],
    onTick(t) {
      act1State.phase = 'launch'
      act1State.launchT = t
      act1State.view = launchViewAt(t)
      cabinState.engine = engineLevel(t)
      cabinState.alarm = alarmOn(t)
    },
  }).start()

  registerInteractable({
    id: 'act1:dsky',
    verb: 'KEY IN',
    position: { ...DSKY_POS },
    radius: DSKY_RADIUS,
    enabled: () => stages.stage() === 'keyin',
    use() {
      const n = stages.press()
      if (!n) return
      audio.play('key')
      syncDsky()
      if (n === 3) {
        setObjective(null)
        startTli()
      }
    },
  })
}

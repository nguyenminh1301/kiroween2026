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
import { registerInteractable, registerSighting } from '../../interaction/interactables'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { showHint } from '../../ui/hints'
import {
  BODY_POS,
  DSKY_POS,
  DSKY_RADIUS,
  HATCH_WINDOW,
  O2_POS,
  O2_RADIUS,
  RIGHT_WINDOW,
  START_PITCH,
  SWITCH_POS,
  SWITCH_RADIUS,
} from './layout'
import { createStages } from './stages'
import { act1State, resetAct1State } from './state'
import {
  alarmOn,
  engineLevel,
  LAUNCH_DURATION,
  LAUNCH_SHAKE,
  LAUNCH_SHOTS,
  launchEvents,
  launchViewAt,
  TLI_DURATION,
  TLI_SHAKE,
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
  audio.setScene({ hum: 0.6, bed: 'ship', breath: true })
  gameStore.getState().setFear(0.05)
  gameStore.getState().setHeartRate(84)

  const stages = createStages()

  const say = (id: string, opts: { urgent?: boolean; onStart?: () => void } = {}, done: () => void = () => {}): void => {
    void radio.say(id, { urgent: opts.urgent, onStart: opts.onStart }).then(() => {
      if (alive) done()
    })
  }
  const setObjective = (key: 'act1Switch' | 'act1Key' | null): void =>
    gameStore.getState().setObjective(key ? CHECKLISTS[key] : null)
  const syncDsky = (): void => {
    act1State.dsky = stages.dsky()
    act1State.dskyVersion++
  }

  // TLI, then the Earth in the windows, then hand-off.
  function startTli(): void {
    say('act1.tli', {}, () => {
      new TimelinePlayer({
        duration: TLI_DURATION,
        shots: TLI_SHOTS,
        shake: TLI_SHAKE,
        events: tliEvents({
          playSound: (n) => audio.play(n),
          showEarth: () => {
            act1State.earth = true
          },
          earthLines: () =>
            say('act1.earth', { onStart: () => focus.focusOn(RIGHT_WINDOW, 1.5) }, () =>
              say('act1.moon', {}, () =>
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
          act1State.engine = tliEngineLevel(t)
        },
      }).start()
    })
  }

  function onLaunchEnd(): void {
    if (!stages.launchDone()) return
    act1State.view = 'cabin'
    say('act1.switch', {
      onStart: () => {
        focus.focusOn(SWITCH_POS, 1.5)
        setObjective('act1Switch')
        void showHint('use')
      },
    })
  }

  new TimelinePlayer({
    duration: LAUNCH_DURATION,
    shots: LAUNCH_SHOTS,
    shake: LAUNCH_SHAKE,
    events: [
      ...launchEvents({
        say: (id, opts) => say(id, opts),
        playSound: (n) => audio.play(n),
        ignite: () => {
          act1State.ignited = true
        },
        liftoff: () => {},
        setSky: (c) => {
          act1State.sky = c
        },
        focusOverhead: () => focus.focusOn(HATCH_WINDOW, 1.8),
        focusO2: () => focus.focusOn(O2_POS, 1.2),
      }),
      { at: LAUNCH_DURATION, run: onLaunchEnd },
    ],
    onTick(t) {
      act1State.launchT = t
      act1State.view = launchViewAt(t)
      act1State.engine = engineLevel(t)
      act1State.alarm = alarmOn(t)
    },
  }).start()

  registerInteractable({
    id: 'act1:switch',
    verb: 'FLIP',
    position: { ...SWITCH_POS },
    radius: SWITCH_RADIUS,
    enabled: () => stages.stage() === 'switch',
    use() {
      if (!stages.flip()) return
      audio.play('switch')
      act1State.switchFlipped = true
      syncDsky()
      setObjective('act1Key')
      say('act1.key', { onStart: () => focus.focusOn(DSKY_POS, 1.5) })
    },
  })
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
  registerSighting({ id: 'o2-for-four', position: { ...O2_POS }, radius: O2_RADIUS, maxDistance: 3 })
}

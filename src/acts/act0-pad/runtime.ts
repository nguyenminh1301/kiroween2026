// Act 0 start-up: player body, collision, ambience, interactables, sighting and the beat machine.
// Everything goes through the cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { CHECKLISTS } from '../../content/checklists'
import { completeAct } from '../../engine/actFlow'
import { createBody } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { addSystem } from '../../engine/registerHelpers'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { gameStore } from '../../engine/store'
import { fxStore } from '../../engine/fx'
import { focus } from '../../interaction/Focus'
import { registerInteractable } from '../../interaction/interactables'
import { showHint } from '../../ui/hints'
import type { Vec3 } from '../../types'
import { createBeats, type BeatDeps, type CrewId } from './beats'
import { crowdAim, decayExcitement } from './crowdLogic'
import {
  COLLISION_BOXES,
  HATCH_POS,
  HATCH_RADIUS,
  inWhiteRoom,
  PAD0_POS,
  PAD1_POS,
  PAD2_POS,
  PLAYER_START,
} from './room'
import { act0State, resetAct0State } from './state'

const LOGIC_PRIORITY = 300

const headAt = (p: Vec3): Vec3 => ({ x: p.x, y: 1.7, z: p.z })
const LINE_POSITION: Record<string, Vec3> = {
  'act0.tech1': headAt(PAD0_POS),
  'act0.tech2': headAt(PAD2_POS),
  'act0.wave': headAt(PAD0_POS),
  'act0.gunter1': headAt(PAD1_POS),
  'act0.gunter2': headAt(PAD1_POS),
}

export function startAct0(): void {
  resetAct0State()
  setPlayerBody(createBody({ pos: { ...PLAYER_START }, yaw: 0, pitch: 0, mode: 'walk' }))
  gameStore.getState().setMoveMode('walk')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
  })

  addPlayerSystem({ boxes: COLLISION_BOXES, ground: () => 0, seatForwardYaw: 0 })

  startAudioSession()
  const ambience = { bed: 'none', hum: 0, wind: 1, birds: true, breath: false } as const
  let walking = false
  let inRoom = false
  const applyAmbience = (): void =>
    audio.setScene({
      ...ambience,
      wind: inRoom ? 0.3 : 1,
      birds: !inRoom,
      steps: walking ? 1 : 0,
    })
  applyAmbience()

  const deps: BeatDeps = {
    say(id, opts, done) {
      void radio
        .say(id, { urgent: opts.urgent, beat: opts.beat, onStart: opts.onStart, position: LINE_POSITION[id] })
        .then(() => {
          if (alive) done()
        })
    },
    setBeat: (n) => radio.setBeat(n),
    setObjective: (key) => gameStore.getState().setObjective(key ? CHECKLISTS[key] : null),
    showHint: (id) => void showHint(id),
    cheer(level) {
      audio.play('cheer')
      act0State.excitement = Math.max(act0State.excitement, level)
    },
    playSound: (n) => audio.play(n),
    setHatch(handle, open, fade) {
      act0State.handle = handle
      act0State.hatchOpen = open
      fxStore.getState().setBlackout(fade)
    },
    lock() {
      const b = getPlayerBody()
      if (!b) return
      b.vel = { x: 0, y: 0, z: 0 }
      b.mode = 'seated'
    },
    complete: completeAct,
  }
  const beats = createBeats(deps)

  registerInteractable({
    id: 'act0:wave',
    verb: 'WAVE',
    position: { x: 0, y: 1.2, z: 0 },
    radius: 0,
    enabled: () => !beats.state().boarded && !inRoom,
    aim: (_eye, dir) => crowdAim(dir),
    use() {
      act0State.waved = true
      beats.wave()
    },
  })
  registerInteractable({
    id: 'act0:hatch',
    verb: 'GRAB',
    position: { ...HATCH_POS },
    radius: HATCH_RADIUS,
    enabled: () => !beats.state().boarded,
    use: () => beats.board(),
  })
  const talkTo = (who: CrewId, at: Vec3): void => {
    registerInteractable({
      id: `act0:talk-${who}`,
      verb: 'TALK',
      position: { x: at.x, y: 1.3, z: at.z },
      radius: 0.5,
      reach: 2.6,
      enabled: () => !beats.state().boarded,
      use: () => beats.talk(who),
    })
  }
  talkTo('tech1', PAD0_POS)
  talkTo('tech2', PAD2_POS)
  talkTo('gunter', PAD1_POS)

  addSystem(
    'act0-logic',
    LOGIC_PRIORITY,
    (dt) => {
      act0State.excitement = decayExcitement(act0State.excitement, dt)
      beats.tick(dt)
      const body = getPlayerBody()
      if (!body) return
      const isWalking = Math.hypot(body.vel.x, body.vel.z) > 0.2
      const isInRoom = inWhiteRoom(body.pos.z)
      if (isWalking !== walking || isInRoom !== inRoom) {
        walking = isWalking
        inRoom = isInRoom
        applyAmbience()
      }
      if (isInRoom) beats.enterRoom()
    },
    { pausable: true },
  )
}

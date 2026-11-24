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
import { focus } from '../../interaction/Focus'
import { registerInteractable, registerSighting } from '../../interaction/interactables'
import { headOf } from '../../procgen/anchors'
import { showHint } from '../../ui/hints'
import type { Vec3 } from '../../types'
import { createBeats, type BeatDeps } from './beats'
import { crowdAim, decayExcitement } from './crowdLogic'
import {
  BOOTPRINT_ANOMALY,
  COLLISION_BOXES,
  HATCH_POS,
  HATCH_RADIUS,
  inWhiteRoom,
  PAD0_POS,
  PAD1_POS,
  PLAYER_START,
} from './room'
import { act0State, resetAct0State } from './state'

const LOGIC_PRIORITY = 300

const headAt = (p: Vec3): Vec3 => ({ x: p.x, y: 1.7, z: p.z })
const LINE_POSITION: Record<string, Vec3> = {
  'act0.pad1': headAt(PAD0_POS),
  'act0.pad2': headAt(PAD0_POS),
  'act0.pad3': headAt(PAD1_POS),
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
        .say(id, { urgent: opts.urgent, onStart: opts.onStart, position: LINE_POSITION[id] })
        .then(() => {
          if (alive) done()
        })
    },
    focusOn: (target, seconds) => focus.focusOn(target, seconds),
    headOf,
    setObjective: (key) => gameStore.getState().setObjective(key ? CHECKLISTS[key] : null),
    showHint: (id) => void showHint(id),
    cheer(level) {
      audio.play('cheer')
      act0State.excitement = Math.max(act0State.excitement, level)
    },
    playSwitch: () => audio.play('switch'),
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
  registerSighting({ ...BOOTPRINT_ANOMALY })

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

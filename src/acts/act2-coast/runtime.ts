// Act 2 start-up: zero-g body, ambience, rails, interactables, the beats and the sleep.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { CHECKLISTS } from '../../content/checklists'
import { completeAct } from '../../engine/actFlow'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { fxStore } from '../../engine/fx'
import { inputState } from '../../engine/inputRuntime'
import { createBody, eyePosition } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody, updatePlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { addSystem, addTimeout } from '../../engine/registerHelpers'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { isHandrailUsable } from '../../interaction/handrail'
import { nearestOnSegment } from '../../interaction/targeting'
import { getHandrails, registerHandrail, registerInteractable } from '../../interaction/interactables'
import { headOf } from '../../procgen/anchors'
import { showHint } from '../../ui/hints'
import {
  bagPos,
  BAG_RADIUS,
  BREAKER_POS,
  BREAKER_RADIUS,
  breathPos,
  cmFarFor,
  collisionBoxes,
  guideToAxis,
  LANDER_ENTRY_Z,
  OUT_VIEW,
  PEN_POS,
  PEN_RADIUS,
  rails,
  sleepEye,
  SLEEP_YAW,
  START_POS,
  TUNNEL_VIEW,
} from './layout'
import { createAct2Beats, type ObjectiveKey } from './beats'
import { createPhases } from './phases'
import { createSleepTimer } from './sleepTimer'
import { act2State, resetAct2State, setCmFar } from './state'

const LOGIC_PRIORITY = 300
/** Before the player step (100), so the eased body enters the tunnel without a collision. */
const GUIDE_PRIORITY = 90

export function startAct2(): void {
  resetAct2State()
  setPlayerBody(createBody({ pos: { ...START_POS }, yaw: 0, pitch: 0, mode: 'zeroG' }))
  gameStore.getState().setMoveMode('zeroG')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
    gameStore.getState().setFear(0)
    gameStore.getState().setTension('CALM')
  })

  const step = { boxes: collisionBoxes(cmFarFor(false)), seatForwardYaw: 0 }
  addPlayerSystem(step)
  startAudioSession()
  audio.setScene({ hum: 1, bed: 'ship', breath: true })
  gameStore.getState().setFear(0.1)
  gameStore.getState().setHeartRate(76)

  const phases = createPhases()
  const setObjective = (key: ObjectiveKey | null): void =>
    gameStore.getState().setObjective(key ? CHECKLISTS[key] : null)

  // Rails: one pair per z step. Rebuilt when the tunnel grows, removed once in the bag.
  let removeRails: Array<() => void> = []
  const buildRails = (): void => {
    removeRails.forEach((r) => r())
    removeRails = rails(act2State.cmFar).map((r) => registerHandrail({ id: `act2:${r.id}`, a: r.a, b: r.b }))
  }
  buildRails()

  const beats = createAct2Beats({
    radio,
    alive: () => alive,
    focusOn: (t, secs) => focus.focusOn(t, secs),
    headOf,
    setObjective,
    outView: OUT_VIEW,
    breakerPos: BREAKER_POS,
    tunnelView: TUNNEL_VIEW,
  })
  setObjective('act2Out')
  addTimeout(() => beats.begin(), 1)

  // Positions that move with `cmFar` are mutated in place.
  const bagPosition = { ...bagPos(act2State.cmFar) }

  registerInteractable({
    id: 'act2:pen',
    verb: 'GRAB',
    position: { ...PEN_POS },
    radius: PEN_RADIUS,
    enabled: () => phases.enabled('act2:pen'),
    use() {
      if (!phases.takePen()) return
      audio.play('click')
      act2State.penHeld = true
      beats.takePen()
    },
  })
  registerInteractable({
    id: 'act2:breaker',
    verb: 'GRAB',
    position: { ...BREAKER_POS },
    radius: BREAKER_RADIUS,
    enabled: () => phases.enabled('act2:breaker'),
    use() {
      if (!phases.fixBreaker()) return
      audio.play('breakerPush')
      act2State.penHeld = false
      act2State.breakerFixed = true
      // Rebuilt while the player is in the lander: the way back is 1.5 m longer.
      const far = cmFarFor(true)
      step.boxes = collisionBoxes(far)
      setCmFar(far)
      Object.assign(bagPosition, bagPos(far))
      buildRails()
      beats.fixBreaker()
      gameStore.getState().setTension('UNEASE')
    },
  })

  const timer = createSleepTimer({
    rng: Math.random,
    whisper: (id) => beats.say(id),
    setBlackout: (v) => fxStore.getState().setBlackout(v),
    setFlashes: (f) => fxStore.getState().setFlashes(f),
    breathe: () => audio.play('breathe', { position: breathPos(act2State.cmFar) }),
    fourthSleeper: () => gameStore.getState().addAnomalySeen('fourth-sleeper'),
    complete() {
      phases.finish()
      completeAct()
    },
  })

  registerInteractable({
    id: 'act2:bag',
    verb: 'SLEEP',
    position: bagPosition,
    radius: BAG_RADIUS,
    enabled: () => phases.enabled('act2:bag'),
    use() {
      if (!phases.enterBag()) return
      audio.play('zipper')
      removeRails.forEach((r) => r())
      removeRails = []
      act2State.inBag = true
      focus.clearFocus()
      const eye = sleepEye(act2State.cmFar)
      step.seatForwardYaw = SLEEP_YAW
      gameStore.getState().setMoveMode('seated')
      updatePlayerBody({
        pos: { x: eye.x, y: eye.y - 1.65, z: eye.z },
        yaw: SLEEP_YAW,
        pitch: 0,
        mode: 'seated',
      })
      beats.enterBag()
      void showHint('sleep')
    },
  })

  addSystem(
    'act2-guide',
    GUIDE_PRIORITY,
    (dt) => {
      const body = getPlayerBody()
      if (!body || act2State.inBag) return
      const g = guideToAxis(body.pos.x, body.pos.y, body.pos.z, act2State.cmFar, dt)
      if (g.x !== body.pos.x || g.y !== body.pos.y) {
        setPlayerBody({ ...body, pos: { x: g.x, y: g.y, z: body.pos.z } })
      }
    },
    { pausable: true },
  )

  let shownPush = false
  addSystem(
    'act2-logic',
    LOGIC_PRIORITY,
    (dt) => {
      const body = getPlayerBody()
      if (!body) return
      const z = body.pos.z
      if (phases.phase() === 'outbound') {
        if (z < LANDER_ENTRY_Z && phases.crossLander()) {
          beats.crossLander()
        }
        if (!shownPush) {
          const eye = eyePosition(body)
          if (getHandrails().some((r) => isHandrailUsable(eye, nearestOnSegment(eye, r.a, r.b)))) {
            shownPush = true
            void showHint('push')
          }
        }
      } else if (phases.phase() === 'return' && z > act2State.cmFar && phases.crossCm()) {
        gameStore.getState().addAnomalySeen('tunnel-longer')
        beats.crossCm()
      }
      if (phases.inBag()) timer.tick(dt, inputState.held.closeEyes)
    },
    { pausable: true },
  )
}

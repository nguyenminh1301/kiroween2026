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
import { addPlayerSystem, PLAYER_PRIORITY } from '../../engine/playerSystem'
import { addSystem, addTimeout } from '../../engine/registerHelpers'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { createCloseUp } from '../../interaction/closeUp'
import { isHandrailUsable } from '../../interaction/handrail'
import { nearestOnSegment } from '../../interaction/targeting'
import { getHandrails, registerHandrail, registerInteractable } from '../../interaction/interactables'
import { showHint } from '../../ui/hints'
import {
  bagPos,
  BAG_RADIUS,
  breathPos,
  cdrPos,
  cmFarFor,
  collisionBoxes,
  CLOSE_UP_DISTANCE,
  gaugePos,
  GAUGE_RADIUS,
  guideToAxis,
  JOINT_NEAR_Z,
  JOINT_POS,
  JOINT_RADIUS,
  KEYPAD_POS,
  LANDER_ENTRY_Z,
  mikePos,
  PAD_RADIUS,
  PANEL_POS,
  POUCH_POS,
  POUCH_RADIUS,
  rails,
  sleepEye,
  SLEEP_YAW,
  START_POS,
} from './layout'
import { createAct2Beats, type Next, type ObjectiveKey, type RepairName } from './beats'
import { borrowMoveKeys, type Borrowed } from './dialKeys'
import { createPhases } from './phases'
import { KNOB_SPEED, needleAngle, BAND_HI, BAND_LO, repairObjective, WHEEL_STEP } from './repairs'
import { createSleepTimer } from './sleepTimer'
import { act2State, resetAct2State, setCmFar } from './state'

const LOGIC_PRIORITY = 300
/** Before the player step (100), so the eased body enters the tunnel without a collision. */
const GUIDE_PRIORITY = 90
/** Before the player step, so the gauge can take A and D away from the movement. */
const GAUGE_PRIORITY = 50

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
  audio.setScene({ hum: 1, bed: 'ship', breath: false })
  gameStore.getState().setFear(0.1)
  gameStore.getState().setHeartRate(76)

  const phases = createPhases()
  const R = act2State.repairs

  /** The strip: the dynamic repair list, or one of the fixed objectives. */
  const setObjective = (key: ObjectiveKey | null): void => {
    if (key === 'repairs') {
      const o = repairObjective(R.s)
      gameStore.getState().setObjective({ text: o.text, keys: 'E', markers: o.markers })
    } else gameStore.getState().setObjective(key ? CHECKLISTS[key] : null)
  }

  // Rails: one pair per z step. Rebuilt when the tunnel grows, removed once in the bag.
  let removeRails: Array<() => void> = []
  const buildRails = (): void => {
    removeRails.forEach((r) => r())
    removeRails = rails(act2State.cmFar).map((r) => registerHandrail({ id: `act2:${r.id}`, a: r.a, b: r.b }))
  }
  buildRails()

  const beats = createAct2Beats({ radio, alive: () => alive, setObjective })
  addTimeout(() => beats.begin(), 1)

  // Positions that move with `cmFar` are mutated in place.
  const bagPosition = { ...bagPos(act2State.cmFar) }
  const gaugePosition = { ...gaugePos(act2State.cmFar) }

  /** What comes next once a repair or the trip back is done. */
  const nextStep = (): Next => {
    phases.setRepairsDone(R.allDone())
    if (!R.allDone()) return 'repairs'
    return phases.phase() === 'sleep' ? 'sleep' : 'back'
  }
  const repairDone = (which: RepairName): void => beats.repairDone(which, nextStep())

  // 1. Oxygen line: take the hammer from the pouch, tap the joint three times.
  registerInteractable({
    id: 'act2:pouch',
    verb: 'TAKE',
    position: { ...POUCH_POS },
    radius: POUCH_RADIUS,
    enabled: () => !R.s.hammerHeld && !R.s.o2Done,
    use() {
      if (!R.takeHammer()) return
      audio.play('grab')
      setObjective('repairs')
    },
  })
  registerInteractable({
    id: 'act2:joint',
    verb: 'TAP',
    position: { ...JOINT_POS },
    radius: JOINT_RADIUS,
    enabled: () => R.s.hammerHeld && !R.s.o2Done,
    use() {
      if (!R.tap()) return
      audio.play('tap', { position: JOINT_POS })
      act2State.tapKick = 1
      if (R.s.o2Done) repairDone('o2')
    },
  })

  // 2. Cabin pressure: E brings the dial close, A and D or the wheel turn the knob.
  const showGauge = (): void =>
    fxStore.getState().setGauge({
      needle: R.s.needle,
      needleRad: needleAngle(R.s.needle),
      bandRad: [needleAngle(BAND_LO), needleAngle(BAND_HI)],
      knob: R.s.knob,
      inBand: R.s.needle >= BAND_LO && R.s.needle <= BAND_HI,
      held: Math.min(1, R.s.held),
    })
  // Every close-up gives the body back when it ends, on Esc, or when the player walks off.
  const distanceTo = (p: { x: number; y: number; z: number }): number => {
    const body = getPlayerBody()
    if (!body) return 0
    const e = eyePosition(body)
    return Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z)
  }
  const gaugeUp = createCloseUp({
    maxDistance: CLOSE_UP_DISTANCE,
    onClose() {
      R.closeGauge()
      fxStore.getState().setGauge(null)
    },
  })
  const panelUp = createCloseUp({
    maxDistance: CLOSE_UP_DISTANCE,
    onClose() {
      R.closePanel()
      fxStore.getState().setPad(null)
    },
  })
  const keypadUp = createCloseUp({
    maxDistance: CLOSE_UP_DISTANCE,
    onClose() {
      R.closeKeypad()
      fxStore.getState().setPad(null)
    },
  })
  const closeAll = (): void => {
    gaugeUp.esc()
    panelUp.esc()
    keypadUp.esc()
  }
  cleanupRegistry.register(() => {
    fxStore.getState().setGauge(null)
    fxStore.getState().setPad(null)
  })
  // Esc, or the game pausing, ends any close-up.
  const unsubPause = gameStore.subscribe((s, prev) => {
    if (s.paused && !prev.paused) closeAll()
  })
  cleanupRegistry.register(unsubPause)
  const showPad = (): void => {
    if (R.s.panelOpen) fxStore.getState().setPad({ kind: 'panel', switches: [...R.s.panel] })
    else if (R.s.keypadOpen) fxStore.getState().setPad({ kind: 'keypad', entry: R.s.entry, err: R.s.oprErr })
  }
  registerInteractable({
    id: 'act2:gauge',
    verb: 'ADJUST',
    position: gaugePosition,
    radius: GAUGE_RADIUS,
    enabled: () => !R.s.pressDone,
    use() {
      if (R.s.gaugeOpen) {
        gaugeUp.done()
        return
      }
      if (!R.openGauge()) return
      gaugeUp.open()
      audio.play('click')
      const body = getPlayerBody()
      if (body) setPlayerBody({ ...body, vel: { x: 0, y: 0, z: 0 } })
      showGauge()
      void showHint('gauge')
    },
  })
  let wheel = 0
  const onWheel = (e: WheelEvent): void => {
    if (R.s.gaugeOpen) {
      wheel += e.deltaY
      e.preventDefault()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('wheel', onWheel, { passive: false })
    cleanupRegistry.register(() => window.removeEventListener('wheel', onWheel))
  }
  let borrowed: Borrowed | null = null
  addSystem(
    'act2-gauge-keys',
    PLAYER_PRIORITY + 1,
    () => {
      borrowed?.restore()
      borrowed = null
    },
    { pausable: true },
  )
  addSystem(
    'act2-gauge',
    GAUGE_PRIORITY,
    (dt) => {
      if (R.s.gaugeOpen) {
        // The dial uses A and D, so the body does not strafe or drift meanwhile.
        // The keys go back after the player step, so a held key keeps turning the dial.
        borrowed = borrowMoveKeys(inputState.held)
        R.turn(borrowed.dir * KNOB_SPEED * dt + wheel * WHEEL_STEP)
        wheel = 0
      }
      const wasOpen = R.s.gaugeOpen
      const done = R.tick(dt)
      if (R.s.gaugeOpen) {
        showGauge()
        gaugeUp.tick(distanceTo(gaugePosition))
      } else if (wasOpen) {
        gaugeUp.done()
      }
      if (done === 'press') {
        audio.play('switch')
        repairDone('press')
      }
    },
    { pausable: true },
  )

  // 3. Breaker panel: E opens it, keys 1 to 6 flip the breakers to match the card.
  // 4. Landing site keypad: E opens it, type the five digits from the card, Enter.
  registerInteractable({
    id: 'act2:panel',
    verb: 'FLIP',
    position: { ...PANEL_POS },
    radius: PAD_RADIUS,
    enabled: () => !R.s.panelDone,
    use() {
      if (R.s.panelOpen) {
        panelUp.done()
        return
      }
      keypadUp.esc()
      if (!R.openPanel()) return
      panelUp.open()
      audio.play('click')
      showPad()
    },
  })
  registerInteractable({
    id: 'act2:keypad',
    verb: 'KEY IN',
    position: { ...KEYPAD_POS },
    radius: PAD_RADIUS,
    enabled: () => !R.s.siteDone,
    use() {
      if (R.s.keypadOpen) {
        keypadUp.done()
        return
      }
      panelUp.esc()
      if (!R.openKeypad()) return
      keypadUp.open()
      audio.play('click')
      showPad()
    },
  })
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      closeAll()
      return
    }
    if (R.s.panelOpen) {
      const m = /^(?:Digit|Numpad)([1-6])$/.exec(e.code)
      if (!m) return
      e.preventDefault()
      if (R.flip(Number(m[1]) - 1)) {
        audio.play('switch')
        panelUp.done()
        repairDone('panel')
      } else {
        audio.play('click')
        showPad()
      }
    } else if (R.s.keypadOpen) {
      const d = /^(?:Digit|Numpad)([0-9])$/.exec(e.code)
      if (d) {
        e.preventDefault()
        if (R.digit(d[1])) audio.play('key')
      } else if (e.code === 'Backspace') {
        e.preventDefault()
        R.backspace()
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault()
        const res = R.enter()
        if (res === 'ok') {
          audio.play('switch')
          keypadUp.done()
          repairDone('site')
          return
        }
        if (res === 'err') audio.play('click')
      } else return
      showPad()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKey)
    cleanupRegistry.register(() => window.removeEventListener('keydown', onKey))
  }
  addSystem(
    'act2-pads',
    GAUGE_PRIORITY + 1,
    () => {
      if (R.s.panelOpen) panelUp.tick(distanceTo(PANEL_POS))
      if (R.s.keypadOpen) keypadUp.tick(distanceTo(KEYPAD_POS))
    },
    { pausable: true },
  )

  const timer = createSleepTimer({
    setBlackout: (v) => fxStore.getState().setBlackout(v),
    setHum: (level) => audio.setScene({ hum: level, bed: 'ship', breath: false }),
    breathe(i) {
      const pos = [cdrPos, mikePos, undefined, breathPos][i]?.(act2State.cmFar)
      audio.play('breathe', { position: pos, gain: i === 3 ? 0.55 : 0.8 })
    },
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
  let saidJoint = false
  addSystem(
    'act2-logic',
    LOGIC_PRIORITY,
    (dt) => {
      const body = getPlayerBody()
      if (!body) return
      const z = body.pos.z
      if (phases.phase() === 'repairs') {
        if (!saidJoint && !R.s.o2Done && z < JOINT_NEAR_Z) {
          saidJoint = true
          beats.nearJoint()
        }
        if (z < LANDER_ENTRY_Z && phases.enterLander()) {
          // The player is in the lander: the way back grows by 1.5 m without being seen.
          const far = cmFarFor(true)
          step.boxes = collisionBoxes(far)
          setCmFar(far)
          Object.assign(bagPosition, bagPos(far))
          Object.assign(gaugePosition, gaugePos(far))
          buildRails()
          gameStore.getState().setTension('UNEASE')
          beats.enterLander()
        }
        if (z > act2State.cmFar && phases.crossBack()) {
          gameStore.getState().addAnomalySeen('tunnel-longer')
          phases.setRepairsDone(R.allDone())
          beats.crossBack(nextStep())
        }
        if (!shownPush) {
          const eye = eyePosition(body)
          if (getHandrails().some((r) => isHandrailUsable(eye, nearestOnSegment(eye, r.a, r.b)))) {
            shownPush = true
            void showHint('push')
          }
        }
      }
      if (phases.inBag()) timer.tick(dt, inputState.held.closeEyes)
    },
    { pausable: true },
  )
}

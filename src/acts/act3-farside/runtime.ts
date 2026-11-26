// Act 3 start-up: walking body, flashlight ambience, lockers, cage, carrying, the creature, noise and beats.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { breathAllowed } from '../../audio/scene'
import { CHECKLISTS } from '../../content/checklists'
import { HUD } from '../../content/hud'
import { createBreath, stepBreath } from '../../director/breath'
import { hearingThreshold } from '../../director/hearing'
import { meterFill, meterLabel, meterRed, noiseRatio } from '../../director/meter'
import { createMonster, startEncounter, stepMonster, type Monster } from '../../director/monster'
import { stepNoise } from '../../director/noise'
import { setDirectorSource } from '../../director/snapshot'
import { applyTension, createTension, stepHeartRate, stepTension, type Tension } from '../../director/tension'
import { completeAct, restartAct } from '../../engine/actFlow'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { setChoiceHandler } from '../../engine/choiceBridge'
import { setAct3Source } from '../../engine/debugInfo'
import { fxStore } from '../../engine/fx'
import { inputState } from '../../engine/inputRuntime'
import { DEFAULT_WALK_SPEED } from '../../engine/movement'
import { createBody } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody, updatePlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { addSystem } from '../../engine/registerHelpers'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { registerInteractable } from '../../interaction/interactables'
import { lungeFrame } from '../../procgen/lunge'
import { showHint } from '../../ui/hints'
import { createBeats, initialVitals, type BeatDeps, type Choice, type Crew } from './beats'
import {
  BAG_RADIUS,
  BAG_STAND,
  bagUsePos,
  cageDoorBox,
  CAGE_DOOR_POS,
  CAGE_DOOR_RADIUS,
  cagedVoice,
  CHECKPOINT_DEFS,
  collisionBoxes,
  CREW_RADIUS,
  detectBump,
  LOCKER_EXIT_DELAY,
  LOCKER_YAW,
  SPOTS,
  SLEEP_EYE,
  SLEEP_YAW,
  speedOf,
  type Checkpoint,
} from './layout'
import { act3State, resetAct3State } from './state'

const LOGIC_PRIORITY = 300
const CARRY_SPEED = 0.95
const EYE_HEIGHT = 1.65
const other = (c: Crew): Crew => (c === 'cdr' ? 'cmp' : 'cdr')

/** Who was carried first, kept across restarts of the act. */
let persistedFirst: Crew | null = null

export function startAct3(requested: string): void {
  const cp: Checkpoint = requested in CHECKPOINT_DEFS ? (requested as Checkpoint) : 'start'
  const def = CHECKPOINT_DEFS[cp]
  resetAct3State()
  if (cp === 'start' || cp === 'wp0' || cp === 'wp1') persistedFirst = null
  const later = cp === 'wp2' || cp === 'wp3'
  if (later) persistedFirst ??= 'cdr'
  const asleep = cp === 'start'
  setPlayerBody(
    asleep
      ? createBody({ pos: { x: SLEEP_EYE.x, y: SLEEP_EYE.y - EYE_HEIGHT, z: SLEEP_EYE.z }, yaw: SLEEP_YAW, pitch: 0, mode: 'seated' })
      : createBody({ pos: { ...def.pos }, yaw: def.yaw, pitch: 0, mode: 'walk' }),
  )
  gameStore.getState().setMoveMode(asleep ? 'seated' : 'walk')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
    setDirectorSource(null)
    setAct3Source(null)
    setChoiceHandler(null)
    const s = gameStore.getState()
    s.setFear(0)
    s.setTension('CALM')
    s.setHoldingBreath(false)
    s.setChoiceOpen(false)
    fxStore.getState().setMeter(null)
    fxStore.getState().setEdge(0)
    fxStore.getState().setFlash(null)
    fxStore.getState().setBlackout(0)
    fxStore.getState().setSlit(false)
  })

  const allBoxes = collisionBoxes()
  const doorBox = cageDoorBox()
  allBoxes.push(doorBox)
  const step: {
    boxes: typeof allBoxes
    seatForwardYaw: number
    speed?: number
    seatedYawLimit?: number
    seatedPitchLimit?: number
  } = { boxes: allBoxes, seatForwardYaw: asleep ? SLEEP_YAW : LOCKER_YAW }
  addPlayerSystem(step)
  startAudioSession()
  audio.setScene({ hum: 1, bed: 'engine', breath: breathAllowed('act3-farside', 'dream') })

  const vit = initialVitals(cp)
  let tension: Tension = createTension(vit.tension, vit.fear)
  let heartRate = vit.heartRate
  const store = gameStore.getState()
  store.setTension(tension.state)
  store.setFear(tension.fear)
  store.setHeartRate(heartRate)

  const monster: Monster = createMonster(0)
  act3State.monster = monster
  act3State.creatureVisible = cp === 'wp1'
  if (later && persistedFirst) {
    act3State.laid[persistedFirst] = true
    act3State.second = other(persistedFirst)
    act3State.silent = true
    act3State.creatureVisible = false
  }

  let spotIndex = -1
  let spotTime = 0
  const inSpot = (): boolean => spotIndex >= 0

  const voiceAt = (from: 'cdr' | 'cmp' | 'player' | undefined) =>
    from === 'cdr' || from === 'cmp' ? cagedVoice(from) : undefined
  const say: BeatDeps['say'] = (id, o = {}) => {
    void radio
      .say(id, { urgent: o.urgent, position: voiceAt(o.from), speaker: o.speaker, detuneHz: o.detuneHz })
      .then(() => {
        if (alive) o.then?.()
      })
  }

  const bagMark = { x: 0, y: 1, z: 6 }
  const setBagMark = (who: Crew): void => {
    Object.assign(bagMark, bagUsePos(who))
  }

  const beats = createBeats({
    say,
    setObjective: (key) => gameStore.getState().setObjective(key ? CHECKLISTS[key] : null),
    hint: (id) => void showHint(id),
    tension: (e) => {
      tension = applyTension(tension, e)
      gameStore.getState().setTension(tension.state)
    },
    checkpoint: (name) => gameStore.getState().setCheckpoint(name),
    anomaly: (id) => gameStore.getState().addAnomalySeen(id),
    sfx: (name) => {
      if (name === 'scrape') audio.play('scrape', { position: { x: monster.pos.x, y: 1, z: monster.pos.z } })
      else audio.play(name)
    },
    blackout: (v) => fxStore.getState().setBlackout(v),
    startEncounter: () => {
      startEncounter(monster)
      act3State.creatureVisible = true
    },
    getUp: () => {
      updatePlayerBody({ pos: { ...BAG_STAND }, vel: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0, mode: 'walk' })
    },
    openCage: () => {
      act3State.cageOpen = true
      step.boxes = allBoxes.filter((b) => b !== doorBox)
    },
    carry: (who) => {
      act3State.carried = who
      persistedFirst = who
      step.speed = CARRY_SPEED
      setBagMark(who)
    },
    layDown: (who) => {
      act3State.carried = null
      act3State.laid[who] = true
      act3State.second = other(who)
      step.speed = DEFAULT_WALK_SPEED
      audio.play('zipper')
    },
    setSilent: (on) => {
      act3State.silent = on
      if (on) {
        act3State.creatureVisible = false
        act3State.chase = false
        audio.setScene({ hum: 1, bed: 'none', breath: breathAllowed('act3-farside', 'dream') })
      }
    },
    startLunge: () => {
      act3State.silent = false
      act3State.lunge = 0
      audio.setScene({ hum: 1, bed: 'engine', breath: breathAllowed('act3-farside', 'dream') })
    },
    wakeUp: () => {
      act3State.lunge = null
      act3State.world = 'real'
      act3State.silent = false
      act3State.creatureVisible = false
      act3State.carried = null
      step.seatForwardYaw = SLEEP_YAW
      step.seatedYawLimit = undefined
      step.seatedPitchLimit = undefined
      step.boxes = allBoxes
      updatePlayerBody({
        pos: { x: SLEEP_EYE.x, y: SLEEP_EYE.y - EYE_HEIGHT, z: SLEEP_EYE.z },
        vel: { x: 0, y: 0, z: 0 },
        yaw: SLEEP_YAW,
        pitch: 0.1,
        mode: 'seated',
      })
      audio.setScene({ hum: 0.6, bed: 'ship', breath: breathAllowed('act3-farside', 'cabin') })
      fxStore.getState().setMeter(null)
    },
    openChoice: (open) => gameStore.getState().setChoiceOpen(open),
    storeChoice: (c: Choice) => gameStore.getState().setDreamChoice(c),
    flash: (show) => fxStore.getState().setFlash(show ? HUD.caught : null),
    restart: () => restartAct(),
    complete: () => completeAct(),
    firstCarried: () => persistedFirst,
  })
  beats.start(cp, def.pos.z)
  gameStore.getState().setCheckpoint(cp)
  setChoiceHandler((c) => beats.choose(c))
  setAct3Source(() => ({
    phase: beats.phase(),
    carriedFirst: beats.carriedFirst(),
    carrying: beats.carrying(),
    choice: beats.choice(),
    pick: (n: number) => beats.choose(n === 1 ? 'dream' : 'fine'),
  }))

  function enter(i: number): void {
    const l = SPOTS[i]
    spotIndex = i
    spotTime = 0
    audio.play(l.kind === 'bag' ? 'zipper' : 'locker', { position: { ...l.usePos } })
    focus.clearFocus()
    step.seatForwardYaw = l.yaw
    step.seatedYawLimit = l.look
    step.seatedPitchLimit = l.look
    updatePlayerBody({ pos: { ...l.inside }, vel: { x: 0, y: 0, z: 0 }, yaw: l.yaw, pitch: 0, mode: 'seated' })
    act3State.hideKind = l.kind
    if (l.kind === 'bag') fxStore.getState().setSlit(true)
    const obj = gameStore.getState().objective
    if (obj?.markers?.length) gameStore.getState().setObjective({ ...obj, markers: [] })
    beats.hidden(true)
  }
  function leave(): void {
    const l = SPOTS[spotIndex]
    spotIndex = -1
    audio.play(l.kind === 'bag' ? 'zipper' : 'locker', { position: { ...l.usePos } })
    act3State.hideKind = null
    fxStore.getState().setSlit(false)
    step.seatedYawLimit = undefined
    step.seatedPitchLimit = undefined
    updatePlayerBody({ pos: { ...l.exit }, vel: { x: 0, y: 0, z: 0 }, mode: 'walk' })
    beats.hidden(false)
  }

  SPOTS.forEach((l, i) => {
    registerInteractable({
      id: l.id,
      verb: l.verb,
      position: { ...l.usePos },
      radius: l.radius,
      enabled: () => !inSpot() && beats.hunting() && (l.kind !== 'bag' || act3State.carried === null),
      use: () => enter(i),
    })
  })
  registerInteractable({
    id: 'act3:cage',
    verb: 'OPEN',
    position: { ...CAGE_DOOR_POS },
    radius: CAGE_DOOR_RADIUS,
    enabled: () => beats.phase() === 'cage',
    use: () => beats.useCage(),
  })
  for (const who of ['cdr', 'cmp'] as const) {
    registerInteractable({
      id: `act3:${who}`,
      verb: 'TAKE',
      position: cagedVoice(who),
      radius: CREW_RADIUS,
      enabled: () => beats.phase() === 'cageOpen' || (beats.phase() === 'final' && beats.second() === who),
      use: () => (beats.phase() === 'final' ? beats.useSecond() : beats.pickUp(who)),
    })
  }
  registerInteractable({
    id: 'act3:bags',
    verb: 'LAY DOWN',
    position: bagMark,
    radius: BAG_RADIUS,
    enabled: () => beats.phase() === 'carry' && beats.carrying() !== null,
    use: () => {
      const who = beats.carrying()
      if (who) beats.layDown(who)
    },
  })
  let breath = createBreath()
  let noise = 0.12
  let prevVel = { x: 0, y: 0, z: 0 }
  let breatheIn = 1
  let threshold = hearingThreshold(10)

  setDirectorSource(() => ({
    state: { phase: beats.phase(), alert: monster.mode, gap: 0 },
    noise,
    threshold,
    monster: { pos: { x: monster.pos.x, y: 0, z: monster.pos.z }, mode: monster.mode },
  }))

  addSystem(
    'act3-logic',
    LOGIC_PRIORITY,
    (dt) => {
      const body = getPlayerBody()
      if (!body) return
      const phase = beats.phase()
      const hunted = beats.hunting()

      // Leaving a hiding spot.
      if (inSpot()) {
        spotTime += dt
        if (spotTime >= LOCKER_EXIT_DELAY && inputState.pressed.use) leave()
      }

      // Freeze: waking, the lunge, the black and caught.
      if (beats.frozen() && (body.vel.x || body.vel.y || body.vel.z)) {
        updatePlayerBody({ vel: { x: 0, y: 0, z: 0 } })
      }

      // The lunge: the mouth closes over the view.
      if (act3State.lunge !== null) {
        act3State.lunge = beats.lungeTime()
        const t = beats.lungeTime()
        if (t !== null) fxStore.getState().setBlackout(lungeFrame(t).cover)
      }

      // Noise and breath.
      const holdingKey = hunted && inputState.held.holdBreath
      breath = stepBreath(breath, holdingKey, dt)
      const holding = breath.holding
      gameStore.getState().setHoldingBreath(holding)
      const speed = inSpot() ? 0 : speedOf(body.vel)
      const bumped = !inSpot() && detectBump(prevVel, body.vel)
      prevVel = { ...body.vel }
      const gait = act3State.carried ? 'carry' : 'walk'
      noise = stepNoise(noise, { dt, speed, pushed: false, bumped, holding, gait })

      // The creature.
      const mx = monster.pos.x
      const mz = monster.pos.z
      if (hunted) {
        const events = stepMonster(monster, {
          dt,
          player: { x: body.pos.x, z: body.pos.z },
          hidden: inSpot(),
          holding,
          noise,
          rng: Math.random,
        })
        for (const e of events) {
          if (e === 'sound') {
            audio.play(Math.random() < 0.5 ? 'scrape' : 'click', { position: { x: mx, y: 0.5, z: mz } })
          } else if (e === 'alert') beats.alert()
          else if (e === 'lost') beats.lost()
          else if (e === 'caught') beats.caught()
          else if (e === 'encounterEnd') beats.encounterEnd()
        }
        act3State.sound = noise > threshold ? { x: body.pos.x, z: body.pos.z } : null
      } else act3State.sound = null

      const distance = Math.hypot(body.pos.x - monster.pos.x, body.pos.z - monster.pos.z)
      threshold = hearingThreshold(distance)

      // Breathing follows the creature.
      if (act3State.creatureVisible && hunted && phase !== 'caught') {
        breatheIn -= dt
        if (breatheIn <= 0) {
          breatheIn = 2.2
          audio.play('breathe', { position: { x: monster.pos.x, y: 1.5, z: monster.pos.z } })
        }
      }

      // Meter, fear and heart rate.
      const fx = fxStore.getState()
      if (hunted) {
        const ratio = noiseRatio(noise, distance)
        fx.setMeter({
          label: meterLabel(monster.mode, inSpot(), holding),
          fill: meterFill(ratio),
          red: meterRed(ratio),
        })
      } else if (fx.meter) fx.setMeter(null)
      tension = stepTension(tension, dt)
      heartRate = stepHeartRate(heartRate, tension.fear, holding, dt)
      const g = gameStore.getState()
      g.setFear(tension.fear)
      g.setTension(tension.state)
      g.setHeartRate(heartRate)

      beats.tick(dt, { z: body.pos.z })
    },
    { pausable: true },
  )
}

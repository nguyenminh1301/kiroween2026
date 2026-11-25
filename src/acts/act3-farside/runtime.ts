// Act 3 start-up: zero-g body, flashlight ambience, rails, lockers, the creature, noise and beats.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { CHECKLISTS } from '../../content/checklists'
import { HUD } from '../../content/hud'
import { createBreath, stepBreath } from '../../director/breath'
import { hearingThreshold } from '../../director/hearing'
import { meterFill, meterLabel, meterRed, noiseRatio } from '../../director/meter'
import {
  createMonster,
  setScripted,
  startEncounter,
  stepMonster,
  type Monster,
} from '../../director/monster'
import { stepNoise } from '../../director/noise'
import { setDirectorSource } from '../../director/snapshot'
import { applyTension, createTension, stepHeartRate, stepTension, type Tension } from '../../director/tension'
import { completeAct, restartAct } from '../../engine/actFlow'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { fxStore } from '../../engine/fx'
import { inputState } from '../../engine/inputRuntime'
import { createBody } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody, updatePlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { addSystem } from '../../engine/registerHelpers'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { registerHandrail, registerInteractable } from '../../interaction/interactables'
import { onHandrailPush } from '../../interaction/interactionRuntime'
import { headOf } from '../../procgen/anchors'
import { showHint } from '../../ui/hints'
import type { Vec3 } from '../../types'
import { createBeats, initialVitals, type BeatDeps, type LookTarget } from './beats'
import {
  CHECKPOINT_DEFS,
  collisionBoxes,
  detectBump,
  HATCH_POS,
  LOCKERS,
  LOCKER_EXIT_DELAY,
  LOCKER_RADIUS,
  LOCKER_YAW,
  MIKE_HEAD,
  rails,
  REVEAL_CREATURE_Z,
  speedOf,
  type Checkpoint,
} from './layout'
import { act3State, resetAct3State } from './state'

const LOGIC_PRIORITY = 300
const HATCH_RADIUS = 0.8
const CREATURE_MIN_Z = -43.6

export function startAct3(requested: string): void {
  const cp: Checkpoint = requested in CHECKPOINT_DEFS ? (requested as Checkpoint) : 'start'
  const def = CHECKPOINT_DEFS[cp]
  resetAct3State()
  setPlayerBody(createBody({ pos: { ...def.pos }, yaw: def.yaw, pitch: 0, mode: 'zeroG' }))
  gameStore.getState().setMoveMode('zeroG')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
    setDirectorSource(null)
    const s = gameStore.getState()
    s.setFear(0)
    s.setTension('CALM')
    s.setHoldingBreath(false)
    fxStore.getState().setMeter(null)
    fxStore.getState().setEdge(0)
    fxStore.getState().setFlash(null)
  })

  const step = { boxes: collisionBoxes(), seatForwardYaw: LOCKER_YAW }
  addPlayerSystem(step)
  startAudioSession()
  audio.setScene({ hum: 1, bed: 'engine', breath: true })

  const vit = initialVitals(cp)
  let tension: Tension = createTension(vit.tension, vit.fear)
  let heartRate = vit.heartRate
  const store = gameStore.getState()
  store.setTension(tension.state)
  store.setFear(tension.fear)
  store.setHeartRate(heartRate)

  const monster: Monster = createMonster(def.patrolS)
  act3State.monster = monster
  act3State.creatureVisible = cp !== 'wp3'

  for (const r of rails()) registerHandrail({ id: `act3:${r.id}`, a: r.a, b: r.b })

  let lockerIndex = -1
  let lockerTime = 0
  let pushed = false
  cleanupRegistry.register(onHandrailPush(() => (pushed = true)))
  const inLocker = (): boolean => lockerIndex >= 0

  const lookPoint = (t: LookTarget): (() => Vec3) => {
    if (t === 'cdr') return headOf('cdr')
    if (t === 'mike') return headOf('cmp')
    if (t === 'hatch') return () => HATCH_POS
    return () => ({ x: monster.pos.x, y: 1.8, z: monster.pos.z })
  }

  const say: BeatDeps['say'] = (id, o = {}) => {
    const look = o.look
    void radio
      .say(id, {
        urgent: o.urgent,
        position: o.fromMike ? { ...MIKE_HEAD } : undefined,
        speaker: o.speaker,
        detuneHz: o.detuneHz,
        onStart: look ? () => focus.focusOn(lookPoint(look.target), look.secs) : undefined,
      })
      .then(() => {
        if (alive) o.then?.()
      })
  }

  const beats = createBeats({
    say,
    look: (t, secs) => focus.focusOn(lookPoint(t), secs),
    turnToHatch: (secs) => focus.focusOn(HATCH_POS, secs),
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
      else if (name === 'knock') audio.play('knock', { position: { ...HATCH_POS } })
      else audio.play(name)
    },
    creatureSound: () => {
      audio.play(Math.random() < 0.5 ? 'scrape' : 'click', {
        position: { x: monster.pos.x, y: 0.5, z: monster.pos.z },
      })
    },
    blackout: (v) => fxStore.getState().setBlackout(v),
    edge: (v) => fxStore.getState().setEdge(v),
    startEncounter: () => {
      startEncounter(monster)
      act3State.creatureVisible = true
    },
    revealCreature: (show) => {
      if (show) setScripted(monster, 'scripted', { x: MIKE_HEAD.x - 0.3, z: REVEAL_CREATURE_Z }, Math.PI)
      act3State.creatureVisible = show
    },
    startCrawl: () => {
      const b = getPlayerBody()
      setScripted(monster, 'crawl', { x: (b?.pos.x ?? 0) * 0.5, z: (b?.pos.z ?? 0) - beats.gap() }, Math.PI)
      act3State.creatureVisible = true
      act3State.chase = true
    },
    flash: (show) => fxStore.getState().setFlash(show ? HUD.caught : null),
    restart: () => restartAct(),
    complete: () => completeAct(),
  })
  beats.start(cp, def.pos.z)
  gameStore.getState().setCheckpoint(cp)

  function enter(i: number): void {
    const l = LOCKERS[i]
    lockerIndex = i
    lockerTime = 0
    audio.play('locker', { position: { ...l.doorPos } })
    focus.clearFocus()
    updatePlayerBody({ pos: { ...l.inside }, vel: { x: 0, y: 0, z: 0 }, yaw: LOCKER_YAW, pitch: 0, mode: 'seated' })
    const obj = gameStore.getState().objective
    if (obj?.markers?.length) gameStore.getState().setObjective({ ...obj, markers: [] })
    beats.hidden(true)
  }
  function leave(): void {
    const l = LOCKERS[lockerIndex]
    lockerIndex = -1
    audio.play('locker', { position: { ...l.doorPos } })
    updatePlayerBody({ pos: { ...l.exit }, vel: { x: 0, y: 0, z: 0 }, mode: 'zeroG' })
    beats.hidden(false)
  }

  LOCKERS.forEach((l, i) => {
    registerInteractable({
      id: l.id,
      verb: 'HIDE',
      position: { ...l.doorPos },
      radius: LOCKER_RADIUS,
      enabled: () => !inLocker() && beats.phase() === 'sneak',
      use: () => enter(i),
    })
  })
  registerInteractable({
    id: 'act3:hatch',
    verb: 'GRAB',
    position: { ...HATCH_POS },
    radius: HATCH_RADIUS,
    enabled: () => beats.hatchEnabled(),
    use: () => {
      act3State.chase = false
      beats.useHatch()
    },
  })

  let breath = createBreath()
  let noise = 0.12
  let prevVel: Vec3 = { x: 0, y: 0, z: 0 }
  let flipped = false
  let breatheIn = 1
  let threshold = hearingThreshold(10)

  setDirectorSource(() => ({
    state: { phase: beats.phase(), alert: monster.mode, gap: beats.gap() },
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
      const sneaking = phase === 'sneak'

      // Locker exit.
      if (inLocker()) {
        lockerTime += dt
        if (lockerTime >= LOCKER_EXIT_DELAY && inputState.pressed.use) leave()
      }

      // Freeze: reveal, slam and caught.
      if (beats.frozen() && (body.vel.x || body.vel.y || body.vel.z)) {
        updatePlayerBody({ vel: { x: 0, y: 0, z: 0 } })
      }

      // Look back in the chase: the view turns around while Q is held.
      const back = phase === 'chase' && inputState.held.lookBack
      if (back !== flipped) {
        flipped = back
        updatePlayerBody({ yaw: body.yaw + Math.PI })
      }
      const pushedNow = pushed
      pushed = false
      if (pushedNow && !inLocker()) beats.push()

      // Noise and breath.
      const holdingKey = sneaking && inputState.held.holdBreath
      breath = stepBreath(breath, holdingKey, dt)
      const holding = breath.holding
      gameStore.getState().setHoldingBreath(holding)
      const speed = inLocker() ? 0 : speedOf(body.vel)
      const bumped = !inLocker() && detectBump(prevVel, body.vel)
      prevVel = { ...body.vel }
      noise = stepNoise(noise, { dt, speed, pushed: pushedNow, bumped, holding })

      // The creature.
      const mx = monster.pos.x
      const mz = monster.pos.z
      if (sneaking) {
        const events = stepMonster(monster, {
          dt,
          player: { x: body.pos.x, z: body.pos.z },
          hidden: inLocker(),
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
      } else if (phase === 'reveal' && monster.mode !== 'scripted') {
        setScripted(monster, 'scripted', { x: MIKE_HEAD.x - 0.3, z: REVEAL_CREATURE_Z }, Math.PI)
        act3State.creatureVisible = false
      } else if (phase === 'chase' && monster.mode === 'crawl') {
        monster.pos = { x: body.pos.x * 0.5, z: Math.max(CREATURE_MIN_Z, body.pos.z - beats.gap()) }
      }

      const distance = Math.hypot(body.pos.x - monster.pos.x, body.pos.z - monster.pos.z)
      threshold = hearingThreshold(distance)

      // Breathing follows the creature.
      if (act3State.creatureVisible && phase !== 'caught') {
        breatheIn -= dt
        if (breatheIn <= 0) {
          breatheIn = 2.2
          audio.play('breathe', { position: { x: monster.pos.x, y: 1.5, z: monster.pos.z } })
        }
      }

      // Meter, fear and heart rate.
      const fx = fxStore.getState()
      if (sneaking) {
        const ratio = noiseRatio(noise, distance)
        fx.setMeter({
          label: meterLabel(monster.mode, inLocker(), holding),
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

      beats.tick(dt, { z: body.pos.z, lookingBack: back })
    },
    { pausable: true },
  )
}

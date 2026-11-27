// Act 4 start-up: descent, EVA tasks, the flag photo, the ladder, liftoff and hand-off.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { breathAllowed } from '../../audio/scene'
import { CHECKLISTS } from '../../content/checklists'
import { HUD, PHOTO } from '../../content/hud'
import { completeAct, preloadNextAct } from '../../engine/actFlow'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { fxStore } from '../../engine/fx'
import { MOON_JUMP_SPEED, MOON_GRAVITY, MOON_WALK_SPEED } from '../../engine/movement'
import { setAct4Source } from '../../engine/debugInfo'
import { createBody } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody, updatePlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { addSystem, addTimeout } from '../../engine/registerHelpers'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { registerInteractable } from '../../interaction/interactables'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { showHint } from '../../ui/hints'
import type { Vec3 } from '../../types'
import {
  DESCENT_DURATION,
  DESCENT_SHAKE,
  DESCENT_SHOTS,
  START_HEIGHT,
  descentEvents,
  descentFill,
  cabinShotAt,
  dustAt,
  landerHeight,
  plumeOn,
} from './descent'
import {
  CHECKPOINTS,
  EVA_START,
  FLAG_KIT,
  CABIN_EYE,
  LADDER_SPOT,
  RADIUS,
  PHOTO_SPOT,
  SCOOP_SPOT,
  SEAT_POS,
  SEISMO_KIT,
  collisionBoxes,
  runStart,
  sitePos,
  type Checkpoint,
} from './layout'
import {
  FIRE_AT,
  LIFTOFF_DURATION,
  LIFTOFF_SHAKE,
  LIFTOFF_SHOTS,
  ascentRise,
  fadeAt,
  fireLevel,
  flagTip,
  liftoffEvents,
  readoutAt,
} from './liftoff'
import { DOWN_SECONDS, UP_SECONDS, climbDownAt, climbUpAt, type ClimbFrame } from './climb'
import { limitPosition } from './limits'
import {
  NEIL_DOWN_SECONDS,
  NEIL_FOOT,
  NEIL_PHOTO,
  PHOTO_LIFT,
  WORK_STOPS,
  neilClimbAt,
  photoStop,
  placeNeil,
  sendNeil,
  stepNeil,
} from './neil'
import { act4State, resetAct4State } from './state'
import {
  ITEM_FOR,
  KIT_ID,
  SITE_ID,
  TASK_IDS,
  PHOTO_ID,
  allDone,
  canDo,
  canTake,
  photoPending,
  takePhoto,
  createTasks,
  doTask,
  enabledTargets,
  objectiveText,
  take,
  type Item,
  type TaskId,
  type TaskState,
} from './tasks'
import { SITES, groundAt } from './terrain'

const LOGIC_PRIORITY = 300
const PHOTO_SECONDS = 5
/** Where Buzz watches Neil climb down: above the porch, looking down the ladder. */
const NEIL_WATCH = { y: 4.4, z: 2.35, pitch: -1.0 } as const
const PHOTO_GUARD = 0.5
/** The flash comes this long after Neil starts to lift the camera. */
const FLASH_AT = PHOTO_LIFT + 0.2
const ORBIT_DELAY = 8

type Phase = 'descent' | 'neil' | 'exit' | 'eva' | 'return' | 'climb' | 'liftoff'

const LINE_FOR_TAKE: Partial<Record<Item, string>> = { scoop: 'act4.takescoop', seismo: 'act4.takeseismo' }
const LINE_FOR_DO: Record<TaskId, string> = { flag: 'act4.flag', sample: 'act4.sample', seismo: 'act4.seismo' }
const KIT_SPOT: Record<Item, { pos: Vec3; r: number }> = {
  flag: { pos: FLAG_KIT, r: RADIUS.flagKit },
  scoop: { pos: SCOOP_SPOT, r: RADIUS.tool },
  seismo: { pos: SEISMO_KIT, r: RADIUS.tool },
}

export function startAct4(requested: string): void {
  const cp: Checkpoint = (CHECKPOINTS as readonly string[]).includes(requested) ? (requested as Checkpoint) : 'start'
  resetAct4State()
  const store = gameStore.getState()
  const walk = cp !== 'start'
  const begin = cp === 'run' ? runStart() : { pos: { x: EVA_START.x, y: groundAt(EVA_START.x, EVA_START.z), z: EVA_START.z }, yaw: EVA_START.yaw }
  setPlayerBody(
    walk
      ? createBody({ pos: { ...begin.pos }, yaw: begin.yaw, pitch: 0, mode: 'walk' })
      : createBody({ pos: { ...SEAT_POS }, yaw: 0, pitch: 0, mode: 'seated' }),
  )
  store.setMoveMode(walk ? 'walk' : 'seated')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
    const s = gameStore.getState()
    s.setFear(0)
    s.setTension('CALM')
    setAct4Source(null)
    const fx = fxStore.getState()
    fx.setDsky(null)
    fx.setCaption(null)
    fx.setFlash(null)
    fx.setReadout(null)
    fx.setPhoto(null)
  })

  addPlayerSystem({
    boxes: collisionBoxes(),
    ground: groundAt,
    gravity: MOON_GRAVITY,
    speed: MOON_WALK_SPEED,
    jump: { takeoffSpeed: MOON_JUMP_SPEED },
    seatForwardYaw: 0,
  })
  startAudioSession()

  let phase: Phase = 'descent'
  let tasks: TaskState = createTasks()
  let ready = false
  let climbT = 0
  let clangs = 0
  let farCooldown = 0
  let climbFrom: Vec3 | null = null
  let photo: { close: () => void } | null = null
  let photoBusy = false
  let neilT = 0
  let clock = 0
  setAct4Source(() => ({
    phase,
    time: clock,
    landerY: act4State.landerY,
    carrying: tasks.carrying,
    done: TASK_IDS.filter((t) => tasks.done[t]),
    photo: photo !== null,
    neil: { visible: act4State.neil.visible, anim: act4State.neil.anim, x: act4State.neil.x, z: act4State.neil.z },
  }))

  const say = (id: string, o: { urgent?: boolean; look?: Vec3; secs?: number; then?: () => void } = {}): void => {
    const look = o.look
    void radio
      .say(id, {
        urgent: o.urgent,
        onStart: look ? () => focus.focusOn(look, o.secs ?? 1.5) : undefined,
      })
      .then(() => {
        if (alive) o.then?.()
      })
  }
  const vitals = (fear: number, hr: number): void => {
    const s = gameStore.getState()
    s.setFear(fear)
    s.setHeartRate(hr)
  }
  const syncTasks = (): void => {
    act4State.tasks = tasks
    act4State.carrying = tasks.carrying
    const text = objectiveText(tasks)
    gameStore.getState().setObjective(
      text && phase === 'eva' ? { ...CHECKLISTS.act4Tasks, text, markers: enabledTargets(tasks) } : null,
    )
    if (!text && phase === 'eva' && allDone(tasks)) toLadder()
  }

  // ---- Descent ----
  function descent(): void {
    audio.setScene({ hum: 0.25, bed: 'none', breath: breathAllowed('act4-moon', 'lander') })
    store.setTension('UNEASE')
    vitals(0.3, 110)
    act4State.landerY = START_HEIGHT
    act4State.plume = true
    new TimelinePlayer({
      duration: DESCENT_DURATION,
      shots: DESCENT_SHOTS,
      shake: DESCENT_SHAKE,
      events: [
        ...descentEvents({
          say: (id) => say(id),
          dsky: (r) => fxStore.getState().setDsky(r),
          beep: () => audio.play('alarm'),
          moment: (id) => gameStore.getState().addAnomalySeen(id),
        }),
        { at: DESCENT_DURATION, run: () => alive && neilDown() },
      ],
      onTick(t) {
        clock = t
        const h = landerHeight(t)
        act4State.landerY = h
        act4State.plume = plumeOn(h)
        act4State.dust = dustAt(t)
        act4State.fill = descentFill(t)
        act4State.cabinView = cabinShotAt(DESCENT_SHOTS, t)
        act4State.rcsT = t
        act4State.rcsRate = t > 1 && t < DESCENT_DURATION - 1 ? 1 : 0
      },
    }).start()
  }

  // ---- The ladder, down ----
  const applyClimb = (fr: ClimbFrame): void => {
    updatePlayerBody({ pos: { x: fr.eye.x, y: fr.eye.y - 1.65, z: fr.eye.z }, mode: 'seated' })
    const c = act4State.climb
    c.hands = fr.hands
    c.phase = fr.handPhase
    while (clangs < fr.clangs) {
      clangs++
      audio.play('clang')
    }
  }

  /** Neil climbs down first. The camera sits in the hatch and looks down the ladder. About 5 s. */
  function neilDown(): void {
    phase = 'neil'
    neilT = 0
    clock = 0
    fxStore.getState().setDsky(null)
    act4State.cabinView = false
    act4State.landerY = 0
    act4State.plume = false
    act4State.dust = 0
    act4State.fill = 0
    audio.setScene({ hum: 0, bed: 'none', breath: breathAllowed('act4-moon', 'surface') })
    gameStore.getState().setTension('CALM')
    vitals(0.2, 96)
    gameStore.getState().setCheckpoint('tasks')
    gameStore.getState().setMoveMode('seated')
    updatePlayerBody({ pos: { x: 0, y: NEIL_WATCH.y - 1.65, z: NEIL_WATCH.z }, yaw: Math.PI, pitch: NEIL_WATCH.pitch, mode: 'seated' })
    act4State.neil.visible = true
    applyNeilClimb(0)
  }
  const applyNeilClimb = (t: number): void => {
    const n = act4State.neil
    const fr = neilClimbAt(t)
    n.x = fr.x
    n.y = fr.y
    n.z = fr.z
    n.yaw = fr.yaw
    n.anim = fr.anim
    n.t = fr.t
  }

  /** Crawl backward out of the hatch, climb down nine rungs, drop onto the footpad, step off. About 8 s. */
  function exitHatch(): void {
    phase = 'exit'
    placeNeil(act4State.neil, NEIL_FOOT.x, NEIL_FOOT.z, 'standing')
    act4State.neil.yaw = Math.PI
    act4State.neil.visible = true
    climbT = 0
    clangs = 0
    fxStore.getState().setDsky(null)
    act4State.landerY = 0
    act4State.rcsRate = 0
    act4State.cabinView = false
    act4State.plume = false
    act4State.dust = 0
    act4State.fill = 0
    audio.setScene({ hum: 0, bed: 'none', breath: breathAllowed('act4-moon', 'surface') })
    gameStore.getState().setTension('CALM')
    vitals(0.2, 96)
    gameStore.getState().setCheckpoint('tasks')
    gameStore.getState().setMoveMode('seated')
    updatePlayerBody({ yaw: 0, pitch: -0.15, mode: 'seated' })
    applyClimb(climbDownAt(0))
    say('act4.down')
  }

  // ---- EVA ----
  function eva(intro: boolean): void {
    phase = 'eva'
    fxStore.getState().setDsky(null)
    act4State.landerY = 0
    act4State.plume = false
    act4State.dust = 0
    act4State.fill = 0
    audio.setScene({ hum: 0, bed: 'none', breath: breathAllowed('act4-moon', 'surface') })
    gameStore.getState().setTension('CALM')
    vitals(0.2, 96)
    gameStore.getState().setCheckpoint('tasks')
    if (intro) {
      gameStore.getState().setMoveMode('walk')
      updatePlayerBody({
        pos: { x: EVA_START.x, y: groundAt(EVA_START.x, EVA_START.z), z: EVA_START.z },
        mode: 'walk',
      })
    }
    const ready_ = (): void => {
      ready = true
      syncTasks()
      void showHint('jump')
    }
    say('act4.flagtask', { look: FLAG_KIT, then: ready_ })
  }

  const useKit = (item: Item): void => {
    const next = take(tasks, item)
    if (!next) return
    tasks = next
    audio.play('grab')
    syncTasks()
    if (item === 'flag') focus.focusOn(sitePos('flag'), 1.5)
    else say(LINE_FOR_TAKE[item]!)
  }
  const useSite = (task: TaskId): void => {
    const r = doTask(tasks, task)
    if (!r) return
    tasks = r.state
    audio.play('grab')
    syncTasks()
    say(LINE_FOR_DO[task])
    if (task === 'flag') sendNeil(act4State.neil, [photoStop()])
    if (task === 'seismo') gameStore.getState().addAnomalySeen('seismo-steps')
  }

  const usePhoto = (): void => {
    const next = takePhoto(tasks)
    if (!next) return
    tasks = next
    photoBusy = true
    syncTasks()
    // Neil stands a few metres off, faces Buzz and lifts the camera. Then the flash, the click and the print.
    const n = act4State.neil
    placeNeil(n, NEIL_PHOTO.x, NEIL_PHOTO.z, 'camera')
    sendNeil(n, [photoStop()])
    n.amount = 0
    n.t = 0
    say('act4.photo')
    addTimeout(() => {
      audio.play('shutter')
      const fx = fxStore.getState()
      fx.setWhiteout(1)
      addTimeout(() => fxStore.getState().setWhiteout(0.5), 0.12)
      addTimeout(() => fxStore.getState().setWhiteout(0.2), 0.25)
      addTimeout(() => {
        fxStore.getState().setWhiteout(0)
        photoBusy = false
        showPhoto()
      }, 0.4)
    }, FLASH_AT)
  }

  /** The white flash, then the print for 5 s, or until E or a click. Then the tasks go on. */
  function showPhoto(): void {
    const fx = fxStore.getState()
    fx.setPhoto({ src: PHOTO.src, caption: PHOTO.caption, alt: PHOTO.alt })
    // Neil walks off to work while the print shows.
    sendNeil(act4State.neil, WORK_STOPS, true)
    let open = true
    const close = (): void => {
      if (!open) return
      open = false
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
      fxStore.getState().setPhoto(null)
      photo = null
      syncTasks()
      say('act4.jobs')
      addTimeout(() => alive && say('act4.orbit'), ORBIT_DELAY)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'KeyE' && !e.repeat) close()
    }
    const onClick = (): void => close()
    photo = { close }
    cleanupRegistry.register(() => {
      open = false
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    })
    addTimeout(() => {
      if (!open) return
      window.addEventListener('keydown', onKey)
      window.addEventListener('mousedown', onClick)
    }, PHOTO_GUARD)
    addTimeout(close, PHOTO_SECONDS)
    syncTasks()
  }

  /** All three tasks and the photo are done: Neil sends the player back to the ladder. */
  function toLadder(): void {
    if (phase !== 'eva') return
    phase = 'return'
    gameStore.getState().setCheckpoint('run')
    gameStore.getState().setObjective({ ...CHECKLISTS.act4Return })
    sendNeil(act4State.neil, [{ x: NEIL_FOOT.x, z: NEIL_FOOT.z, act: 'standing', dwell: Infinity }])
    say('act4.back')
  }

  for (const item of ['flag', 'scoop', 'seismo'] as const) {
    registerInteractable({
      id: KIT_ID[item],
      verb: 'GRAB',
      position: { ...KIT_SPOT[item].pos },
      radius: KIT_SPOT[item].r,
      enabled: () => ready && phase === 'eva' && canTake(tasks, item),
      use: () => useKit(item),
    })
  }
  for (const task of TASK_IDS) {
    const s = SITES[task]
    registerInteractable({
      id: SITE_ID[task],
      verb: 'GRAB',
      position: { x: s.x, y: groundAt(s.x, s.z) + 0.25, z: s.z },
      radius: RADIUS.site,
      enabled: () => ready && phase === 'eva' && canDo(tasks, task),
      use: () => useSite(task),
    })
  }
  registerInteractable({
    id: PHOTO_ID,
    verb: 'POSE',
    position: { x: PHOTO_SPOT.x, y: groundAt(PHOTO_SPOT.x, PHOTO_SPOT.z) + 0.25, z: PHOTO_SPOT.z },
    radius: RADIUS.site,
    enabled: () => ready && phase === 'eva' && photo === null && !photoBusy && photoPending(tasks),
    use: usePhoto,
  })
  registerInteractable({
    id: 'act4:ladder',
    verb: 'CLIMB',
    position: { ...LADDER_SPOT },
    radius: RADIUS.ladder,
    enabled: () => phase === 'return',
    use: () => climb(),
  })

  // ---- Ladder and liftoff ----
  function climb(): void {
    if (phase !== 'return') return
    phase = 'climb'
    act4State.neil.visible = false
    audio.setScene({ hum: 0.25, bed: 'none', breath: breathAllowed('act4-moon', 'lander') })
    climbT = 0
    clangs = 0
    focus.clearFocus()
    gameStore.getState().setObjective(null)
    gameStore.getState().setMoveMode('seated')
    const b = getPlayerBody()
    climbFrom = b ? { x: b.pos.x, y: b.pos.y + 1.65, z: b.pos.z } : null
    audio.play('grab')
  }

  function liftoff(): void {
    phase = 'liftoff'
    let pending = 2
    let lastReadout = ''
    let readoutLines = 0
    const fin = (): void => {
      if (--pending === 0) completeAct()
    }
    new TimelinePlayer({
      duration: LIFTOFF_DURATION,
      shots: LIFTOFF_SHOTS,
      shake: LIFTOFF_SHAKE,
      events: liftoffEvents(
        {
          say: (id, o) => say(id, { urgent: o?.urgent, then: id === 'act4.columbia' ? fin : undefined }),
          readout: (on) => {
            if (!on) fxStore.getState().setReadout(null)
          },
          anomaly: (id) => gameStore.getState().addAnomalySeen(id),
          preload: preloadNextAct,
          end: fin,
        },
      ),
      onTick(t) {
        clock = t
        act4State.ascentRise = ascentRise(t)
        fxStore.getState().setBlackout(fadeAt(t))
        act4State.cabinView = cabinShotAt(LIFTOFF_SHOTS, t)
        act4State.rcsT = t
        act4State.rcsRate = t > FIRE_AT + 0.3 && t < LIFTOFF_DURATION - 3 ? 2 : 0
        act4State.fire = fireLevel(t)
        act4State.flagTip = flagTip(t)
        act4State.blast = t >= FIRE_AT ? t - FIRE_AT : -1
        const ro = readoutAt(t, HUD.burnPanel.header, HUD.burnPanel.lines)
        const fx = fxStore.getState()
        const key = ro ? ro.lines.join('|') : ''
        if (ro && key !== lastReadout) {
          if (ro.lines.length > readoutLines) audio.play('readout')
          readoutLines = ro.lines.length
          lastReadout = key
          fx.setReadout(ro)
        }
      },
    }).start()
  }

  // ---- Per-frame logic ----
  addSystem(
    'act4-logic',
    LOGIC_PRIORITY,
    (dt) => {
      const body = getPlayerBody()
      if (!body) return
      if (phase === 'eva' || phase === 'return') {
        const lim = limitPosition(body.pos.x, body.pos.z, dt)
        if (lim.x !== body.pos.x || lim.z !== body.pos.z) updatePlayerBody({ pos: { x: lim.x, y: body.pos.y, z: lim.z }, vel: body.vel })
        farCooldown = Math.max(0, farCooldown - dt)
        if (lim.warn && farCooldown === 0) {
          farCooldown = 25
          say('act4.far')
        }
      }
      if (phase === 'neil') {
        neilT += dt
        clock = neilT
        applyNeilClimb(Math.min(neilT, NEIL_DOWN_SECONDS))
        if (neilT >= NEIL_DOWN_SECONDS) exitHatch()
      } else if (act4State.neil.visible) {
        stepNeil(act4State.neil, Math.min(dt, 0.05))
      }
      if (phase === 'exit') {
        climbT += dt
        clock = climbT
        const fr = climbDownAt(climbT)
        applyClimb(fr)
        if (climbT >= DOWN_SECONDS) {
          act4State.climb.hands = false
          eva(true)
        }
      } else if (phase === 'climb') {
        climbT += dt
        clock = climbT
        const fr = climbUpAt(climbT, climbFrom ?? undefined)
        applyClimb(fr)
        if (climbT >= UP_SECONDS) {
          act4State.climb.hands = false
          updatePlayerBody({ pos: { x: CABIN_EYE.x, y: CABIN_EYE.y - 1.65, z: CABIN_EYE.z } })
          liftoff()
        }
      }
    },
    { pausable: true },
  )

  // ---- Go ----
  if (cp !== 'start') {
    placeNeil(act4State.neil, NEIL_FOOT.x, NEIL_FOOT.z, 'standing')
    act4State.neil.yaw = Math.PI
    act4State.neil.visible = true
  }
  if (cp === 'start') descent()
  else if (cp === 'tasks') eva(false)
  else {
    for (const t of TASK_IDS) tasks = doTask(take(tasks, ITEM_FOR[t])!, t)!.state
    tasks = takePhoto(tasks)!
    phase = 'eva'
    act4State.tasks = tasks
    audio.setScene({ hum: 0, bed: 'none', breath: breathAllowed('act4-moon', 'surface') })
    vitals(0.2, 96)
    toLadder()
  }
  if (cp !== 'start') gameStore.getState().setCheckpoint(cp)
}

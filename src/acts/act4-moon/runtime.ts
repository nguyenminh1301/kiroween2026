// Act 4 start-up: descent, EVA tasks, the flag photo, the ladder, liftoff and hand-off.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { CHECKLISTS } from '../../content/checklists'
import { HUD, PHOTO } from '../../content/hud'
import { completeAct } from '../../engine/actFlow'
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
  LIFTOFF_DURATION,
  LIFTOFF_SHAKE,
  LIFTOFF_SHOTS,
  ascentRise,
  fireLevel,
  flagTip,
  liftoffEvents,
} from './liftoff'
import { DOWN_SECONDS, UP_SECONDS, climbDownAt, climbUpAt, type ClimbFrame } from './climb'
import { limitPosition } from './limits'
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
const PHOTO_GUARD = 0.5

type Phase = 'descent' | 'exit' | 'eva' | 'return' | 'climb' | 'liftoff'

const LINE_FOR_TAKE: Record<Item, string> = { flag: 'act4.plant', scoop: 'act4.takescoop', seismo: 'act4.takeseismo' }
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
  let clock = 0
  setAct4Source(() => ({
    phase,
    time: clock,
    landerY: act4State.landerY,
    carrying: tasks.carrying,
    done: TASK_IDS.filter((t) => tasks.done[t]),
    photo: photo !== null,
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
    audio.setScene({ hum: 0.25, bed: 'none', breath: true })
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
        }),
        { at: DESCENT_DURATION, run: () => alive && exitHatch() },
      ],
      onTick(t) {
        clock = t
        const h = landerHeight(t)
        act4State.landerY = h
        act4State.plume = plumeOn(h)
        act4State.dust = dustAt(t)
        act4State.fill = descentFill(t)
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

  /** Crawl backward out of the hatch, climb down nine rungs, drop onto the footpad, step off. About 8 s. */
  function exitHatch(): void {
    phase = 'exit'
    climbT = 0
    clangs = 0
    fxStore.getState().setDsky(null)
    act4State.landerY = 0
    act4State.plume = false
    act4State.dust = 0
    act4State.fill = 0
    audio.setScene({ hum: 0, bed: 'none', breath: true })
    gameStore.getState().setTension('CALM')
    vitals(0.2, 96)
    gameStore.getState().setCheckpoint('tasks')
    gameStore.getState().setMoveMode('seated')
    updatePlayerBody({ yaw: 0, pitch: -0.15, mode: 'seated' })
    applyClimb(climbDownAt(0))
  }

  // ---- EVA ----
  function eva(intro: boolean): void {
    phase = 'eva'
    fxStore.getState().setDsky(null)
    act4State.landerY = 0
    act4State.plume = false
    act4State.dust = 0
    act4State.fill = 0
    audio.setScene({ hum: 0, bed: 'none', breath: true })
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
    say('act4.flagtask', { look: FLAG_KIT })
    say('act4.jobs', { look: SCOOP_SPOT, then: ready_ })
  }

  const useKit = (item: Item): void => {
    const next = take(tasks, item)
    if (!next) return
    tasks = next
    audio.play('grab')
    syncTasks()
    say(LINE_FOR_TAKE[item], item === 'flag' ? { look: sitePos('flag'), secs: 1.5 } : {})
  }
  const useSite = (task: TaskId): void => {
    const r = doTask(tasks, task)
    if (!r) return
    tasks = r.state
    audio.play('grab')
    syncTasks()
    say(LINE_FOR_DO[task], { then: task === 'flag' ? () => say('act4.photo') : undefined })
  }

  const usePhoto = (): void => {
    const next = takePhoto(tasks)
    if (!next) return
    tasks = next
    audio.play('shutter')
    showPhoto()
  }

  /** The white flash, then the print for 5 s, or until E or a click. Then the tasks go on. */
  function showPhoto(): void {
    const fx = fxStore.getState()
    fx.setPhoto({ src: PHOTO.src, caption: PHOTO.caption, alt: PHOTO.alt })
    let open = true
    const close = (): void => {
      if (!open) return
      open = false
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
      fxStore.getState().setPhoto(null)
      photo = null
      syncTasks()
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
    enabled: () => ready && phase === 'eva' && photo === null && photoPending(tasks),
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
          caption: (t) => fxStore.getState().setCaption(t),
          anomaly: (id) => gameStore.getState().addAnomalySeen(id),
          end: fin,
        },
        HUD.burnRoutine,
      ),
      onTick(t) {
        clock = t
        act4State.ascentRise = ascentRise(t)
        act4State.fire = fireLevel(t)
        act4State.flagTip = flagTip(t)
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
      if (phase === 'exit') {
        climbT += dt
        const fr = climbDownAt(climbT)
        applyClimb(fr)
        if (climbT >= DOWN_SECONDS) {
          act4State.climb.hands = false
          eva(true)
        }
      } else if (phase === 'climb') {
        climbT += dt
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
  if (cp === 'start') descent()
  else if (cp === 'tasks') eva(false)
  else {
    for (const t of TASK_IDS) tasks = doTask(take(tasks, ITEM_FOR[t])!, t)!.state
    tasks = takePhoto(tasks)!
    phase = 'eva'
    act4State.tasks = tasks
    audio.setScene({ hum: 0, bed: 'none', breath: true })
    vitals(0.2, 96)
    toLadder()
  }
  if (cp !== 'start') gameStore.getState().setCheckpoint(cp)
}

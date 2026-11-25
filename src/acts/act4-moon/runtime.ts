// Act 4 start-up: descent, EVA tasks, the creature in the crater, the ladder, liftoff and hand-off.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { CHECKLISTS } from '../../content/checklists'
import { HUD } from '../../content/hud'
import { completeAct, restartAct } from '../../engine/actFlow'
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
import { createEmerged, stepEmerged, type Emerged } from './creature'
import {
  DESCENT_DURATION,
  DESCENT_SHAKE,
  DESCENT_SHOTS,
  START_HEIGHT,
  descentEvents,
  dustLevel,
  landerHeight,
  plumeOn,
} from './descent'
import {
  CHECKPOINTS,
  EVA_START,
  FLAG_KIT,
  LADDER_FOOT,
  LADDER_SPOT,
  PIT_FOR_TASK,
  PORCH,
  RADIUS,
  ROOF,
  SCOOP_SPOT,
  SEAT_POS,
  SEISMO_KIT,
  collisionBoxes,
  runStart,
  sitePos,
  yawToward,
  type Checkpoint,
} from './layout'
import {
  LIFTOFF_DURATION,
  LIFTOFF_SHAKE,
  LIFTOFF_SHOTS,
  ascentRise,
  creatureAt,
  fireLevel,
  flagTip,
  liftoffEvents,
} from './liftoff'
import { act4State, resetAct4State } from './state'
import {
  ITEM_FOR,
  KIT_ID,
  SITE_ID,
  TASK_IDS,
  canDo,
  canTake,
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
const CLIMB_SECONDS = 1.3
const CAUGHT_SECONDS = 1.5
const EMERGE_FALLBACK = 14

type Phase = 'descent' | 'eva' | 'emerge' | 'caught' | 'climb' | 'liftoff'

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
  let creature: Emerged | null = null
  let climbT = 0
  let emerged = false
  let clock = 0
  setAct4Source(() => ({
    phase,
    time: clock,
    landerY: act4State.landerY,
    carrying: tasks.carrying,
    done: TASK_IDS.filter((t) => tasks.done[t]),
    creature: creature ? { x: creature.x, z: creature.z, phase: creature.phase } : null,
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
        { at: DESCENT_DURATION, run: () => alive && eva(true) },
      ],
      onTick(t) {
        clock = t
        const h = landerHeight(t)
        act4State.landerY = h
        act4State.plume = plumeOn(h)
        act4State.dust = dustLevel(h)
      },
    }).start()
  }

  // ---- EVA ----
  function eva(intro: boolean): void {
    phase = 'eva'
    fxStore.getState().setDsky(null)
    act4State.landerY = 0
    act4State.plume = false
    act4State.dust = 0
    audio.setScene({ hum: 0, bed: 'none', breath: true })
    gameStore.getState().setTension('CALM')
    vitals(0.2, 96)
    gameStore.getState().setCheckpoint('tasks')
    if (intro) {
      gameStore.getState().setMoveMode('walk')
      updatePlayerBody({
        pos: { x: EVA_START.x, y: groundAt(EVA_START.x, EVA_START.z), z: EVA_START.z },
        yaw: EVA_START.yaw,
        pitch: 0,
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
    if (r.emerge) {
      gameStore.getState().setObjective(null)
      const go = (): void => emerge(task)
      say(LINE_FOR_DO[task], { then: go })
      addTimeout(go, EMERGE_FALLBACK)
    } else say(LINE_FOR_DO[task])
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
    id: 'act4:ladder',
    verb: 'GRAB',
    position: { ...LADDER_SPOT },
    radius: RADIUS.ladder,
    enabled: () => phase === 'emerge',
    use: () => climb(),
  })

  // ---- Emerge and run ----
  function emerge(last: TaskId): void {
    if (emerged || !alive) return
    emerged = true
    phase = 'emerge'
    gameStore.getState().setCheckpoint('run')
    const pit = PIT_FOR_TASK[last]
    creature = createEmerged(pit, { x: 0, z: 0 })
    act4State.creature.visible = true
    audio.play('sting')
    const s = gameStore.getState()
    s.setTension('CHASE')
    vitals(0.85, 150)
    s.setObjective({ ...CHECKLISTS.act4Run })
    void showHint('jump')
    say('act4.emerge', { look: { x: creature.rim.x, y: 1.2, z: creature.rim.z }, secs: 1.4 })
  }

  function caught(): void {
    phase = 'caught'
    audio.play('sting')
    fxStore.getState().setFlash(HUD.caught)
    updatePlayerBody({ vel: { x: 0, y: 0, z: 0 } })
    addTimeout(() => restartAct(), CAUGHT_SECONDS)
  }

  // ---- Ladder and liftoff ----
  function climb(): void {
    if (phase !== 'emerge') return
    phase = 'climb'
    climbT = 0
    focus.clearFocus()
    gameStore.getState().setObjective(null)
    gameStore.getState().setMoveMode('seated')
    updatePlayerBody({ pos: { ...LADDER_FOOT }, vel: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0.5, mode: 'seated' })
    audio.play('grab')
  }

  function liftoff(): void {
    phase = 'liftoff'
    const c = creature
    const from: Vec3 = c ? { x: c.x, y: groundAt(c.x, c.z), z: c.z } : { x: ROOF.x, y: 0, z: ROOF.z + 6 }
    const heading = yawToward(from.x, from.z, ROOF.x, ROOF.z)
    creature = null
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
          sting: () => audio.play('sting'),
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
        const p = creatureAt(t, from)
        const cr = act4State.creature
        cr.visible = p.visible
        cr.x = p.pos.x
        cr.y = p.pos.y
        cr.z = p.pos.z
        cr.heading = heading
        cr.anim = t < 1.3 ? 'walk' : 'crawl'
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
      if (phase === 'emerge' && creature) {
        const hit = stepEmerged(creature, dt, { x: body.pos.x, z: body.pos.z })
        syncCreature(creature)
        if (hit) caught()
      } else if (phase === 'climb') {
        if (creature) {
          stepEmerged(creature, dt, { x: body.pos.x, z: body.pos.z })
          syncCreature(creature)
        }
        climbT += dt
        const u = Math.min(1, climbT / CLIMB_SECONDS)
        updatePlayerBody({
          pos: {
            x: LADDER_FOOT.x + (PORCH.x - LADDER_FOOT.x) * u,
            y: LADDER_FOOT.y + (PORCH.y - LADDER_FOOT.y) * u,
            z: LADDER_FOOT.z + (PORCH.z - LADDER_FOOT.z) * u,
          },
          vel: { x: 0, y: 0, z: 0 },
          pitch: 0.5,
          mode: 'seated',
        })
        if (u >= 1) liftoff()
      }
    },
    { pausable: true },
  )

  function syncCreature(c: Emerged): void {
    const cr = act4State.creature
    cr.x = c.x
    cr.z = c.z
    cr.y = groundAt(c.x, c.z) - c.depth
    cr.heading = c.heading
    cr.anim = c.phase === 'rim' ? 'freeze' : 'walk'
  }

  // ---- Go ----
  if (cp === 'start') descent()
  else if (cp === 'tasks') eva(false)
  else {
    for (const t of TASK_IDS) {
      const r = doTask(take(tasks, ITEM_FOR[t])!, t)!
      tasks = r.state
    }
    phase = 'eva'
    syncTasks()
    audio.setScene({ hum: 0, bed: 'none', breath: true })
    emerge('seismo')
  }
  if (cp !== 'start') gameStore.getState().setCheckpoint(cp)
}

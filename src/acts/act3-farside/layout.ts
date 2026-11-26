// Fixed positions and collision for act 3. Pure data and functions: no Three.js or React imports.
// Z runs from the lander hatch (+4) to the far end (-44).
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'

export const CHECKPOINTS = ['start', 'wp0', 'wp1', 'wp2', 'wp3'] as const
export type Checkpoint = (typeof CHECKPOINTS)[number]

export interface CheckpointDef {
  pos: Vec3
  yaw: number
  /** Patrol distance the creature starts at. */
  patrolS: number
}

export const CHECKPOINT_DEFS: Record<Checkpoint, CheckpointDef> = {
  start: { pos: { x: -0.7, y: 0.2, z: 6.6 }, yaw: 0, patrolS: 0 },
  wp0: { pos: { x: 0, y: 0.2, z: -4.2 }, yaw: 0, patrolS: 0 },
  wp1: { pos: { x: 0, y: 0.2, z: -37.6 }, yaw: 0, patrolS: 6 },
  wp2: { pos: { x: -0.4, y: 0.2, z: 5.9 }, yaw: Math.PI / 2, patrolS: 20 },
  wp3: { pos: { x: 0, y: 0.2, z: -37.6 }, yaw: 0, patrolS: 0 },
}

/** Going to -z, passing this z sets the checkpoint. wp2 and wp3 are set by events, not by position. */
export const CHECKPOINT_Z: ReadonlyArray<[number, Checkpoint]> = [
  [-5, 'wp0'],
  [-37, 'wp1'],
]
/** Past this z (going to -z) Buzz is at the cage. */
export const CAGE_ARRIVE_Z = -37

export const Z_HATCH_END = 4
export const Z_FAR_END = -44
export const HALF_W = 1.2
export const HEIGHT = 2.4
export const CHAMFER = 0.5

/** The doorway between the cabin and the corridor, at the old hatch end. */
export const DOORWAY = { halfW: 0.5, h: 1.9 }

/** The cabin behind the corridor start: the command module room. */
export const CABIN = { z0: Z_HATCH_END, z1: 7.5, halfW: 1.4, h: 2.4 }
export interface BagDef {
  id: 'buzz' | 'cdr' | 'cmp'
  x: number
  z: number
}
export const BAGS: Record<BagDef['id'], BagDef> = {
  buzz: { id: 'buzz', x: -1.25, z: 6.75 },
  cdr: { id: 'cdr', x: -1.25, z: 5.2 },
  cmp: { id: 'cmp', x: 1.25, z: 6.2 },
}
/** Eye position and yaw lying in Buzz's bag. */
export const SLEEP_EYE: Vec3 = { x: -1.15, y: 1.75, z: BAGS.buzz.z }
export const SLEEP_YAW = -Math.PI / 2
/** Where the player stands up from the bag, feet. */
export const BAG_STAND: Vec3 = { x: -0.7, y: 0.2, z: BAGS.buzz.z - 0.15 }
export const BAG_RADIUS = 0.55
export const bagUsePos = (id: 'cdr' | 'cmp'): Vec3 => ({ x: BAGS[id].x - Math.sign(BAGS[id].x) * 0.05, y: 1.0, z: BAGS[id].z })
export const BUNK_LIGHT: Vec3 = { x: 0, y: 2.3, z: 5.8 }

/** The cage at the far end: bars across z = CAGE.z, a door in the middle, the room behind. */
export const CAGE = { z: -41.3, backZ: Z_FAR_END, doorHalf: 0.35, thick: 0.1 }
export const CAGE_DOOR_POS: Vec3 = { x: 0, y: 1.2, z: CAGE.z }
export const CAGE_DOOR_RADIUS = 0.55
/** Neil on the left, Mike on the right, strapped to the back wall, facing the door. */
export const CAGED: Record<'cdr' | 'cmp', Vec3> = {
  cdr: { x: -0.65, y: 0, z: -43.55 },
  cmp: { x: 0.65, y: 0, z: -43.55 },
}
/** Where the second crewman sits, back to the creature's corner. */
export const SEAT_POS: Vec3 = { x: 0, y: 0, z: -42.8 }
/** Where the creature crouches behind the seated crewman. */
export const AMBUSH_POS: Vec3 = { x: 0, y: 0, z: -43.55 }
export const CREW_RADIUS = 0.55
/** Voice position of a caged crewman. */
export const cagedVoice = (who: 'cdr' | 'cmp'): Vec3 => ({ ...CAGED[who], y: 1.2 })

export interface Opening {
  z0: number
  z1: number
}
export const BAYS: Opening[] = [
  { z0: -11, z1: -9.5 },
  { z0: -23, z1: -21.5 },
]
export const DOORS: Opening[] = [
  { z0: -17, z1: -15.5 },
  { z0: -29, z1: -27.5 },
]
export const ROOM = { x0: 1.6, x1: 4.4, z0: -30, z1: -14 }
export const BAY_DEPTH = 2.4

export interface LockerDef {
  id: string
  /** Centre of the locker body. */
  center: Vec3
  /** Where the eye sits inside. */
  inside: Vec3
  /** Where the player steps out to (feet). */
  exit: Vec3
  doorPos: Vec3
}
export const LOCKER_W = 1
export const LOCKER_D = 0.9
export const LOCKER_H = 2

export const LOCKERS: LockerDef[] = [
  { cx: -1.8, z: -10.25 },
  { cx: -1.8, z: -22.25 },
].map((l, i) => ({
  id: `act3:locker${i}`,
  center: { x: l.cx, y: LOCKER_H / 2, z: l.z },
  inside: { x: l.cx + 0.25, y: 0.2, z: l.z },
  exit: { x: -0.6, y: 0.2, z: l.z },
  doorPos: { x: -1.28, y: 1.2, z: l.z },
}))
export const LOCKER_RADIUS = 0.55
export const LOCKER_YAW = -Math.PI / 2
export const LOCKER_EXIT_DELAY = 0.4
/** Look limit inside a locker: about 30 degrees. */
export const LOCKER_LOOK_LIMIT = (30 * Math.PI) / 180

export const RAIL_X = 1.1
export const RAIL_Y = 1.6
export const RAIL_STEP = 1.5
export const RAIL_HALF = 0.4
export const RAIL_CLEAR = 0.6

export interface RailSpec {
  id: string
  a: Vec3
  b: Vec3
}

const near = (z: number, list: Opening[]): boolean => list.some((o) => z > o.z0 - RAIL_CLEAR && z < o.z1 + RAIL_CLEAR)

/** Handrails every 1.5 m from z 3.25 to -43. Left rails skip the bays, right rails skip the doorways. */
export function rails(): RailSpec[] {
  const out: RailSpec[] = []
  for (let i = 0; 3.25 - i * RAIL_STEP >= -43; i++) {
    const z = 3.25 - i * RAIL_STEP
    if (!near(z, BAYS)) out.push({ id: `rail${i}l`, a: { x: -RAIL_X, y: RAIL_Y, z: z + RAIL_HALF }, b: { x: -RAIL_X, y: RAIL_Y, z: z - RAIL_HALF } })
    if (!near(z, DOORS)) out.push({ id: `rail${i}r`, a: { x: RAIL_X, y: RAIL_Y, z: z + RAIL_HALF }, b: { x: RAIL_X, y: RAIL_Y, z: z - RAIL_HALF } })
  }
  return out
}

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
})

/** Wall slabs along z from `lo` to `hi`, split around `gaps`. */
function split(lo: number, hi: number, gaps: Opening[], make: (z0: number, z1: number) => Box): Box[] {
  const out: Box[] = []
  let z = lo
  for (const g of [...gaps].sort((a, b) => a.z0 - b.z0)) {
    if (g.z0 > z) out.push(make(z, g.z0))
    z = g.z1
  }
  if (hi > z) out.push(make(z, hi))
  return out
}

/** The cage door as a collision slab. Removed when the cage opens. */
export const cageDoorBox = (): Box => box(-CAGE.doorHalf, CAGE.doorHalf, 0, HEIGHT, CAGE.z - CAGE.thick / 2, CAGE.z + CAGE.thick / 2)

/** Collision: floor, ceiling, walls with gaps, bay walls, lockers, side room, cabin, bags, cage bars. */
export function collisionBoxes(): Box[] {
  const zLo = Z_FAR_END - 0.5
  const zHi = CABIN.z1 + 0.5
  const W = HALF_W
  const C = CABIN.halfW
  const boxes: Box[] = [
    box(-6, 6, -0.5, 0, zLo, zHi), // floor
    box(-6, 6, HEIGHT, HEIGHT + 0.5, zLo, zHi), // ceiling
    box(-W, W, 0, HEIGHT, zLo, Z_FAR_END), // far end
    // Doorway wall between the corridor and the cabin.
    box(-C, -DOORWAY.halfW, 0, HEIGHT, Z_HATCH_END, Z_HATCH_END + 0.2),
    box(DOORWAY.halfW, C, 0, HEIGHT, Z_HATCH_END, Z_HATCH_END + 0.2),
    box(-DOORWAY.halfW, DOORWAY.halfW, DOORWAY.h, HEIGHT, Z_HATCH_END, Z_HATCH_END + 0.2),
    // Cabin walls.
    box(-C - 0.5, -C, 0, HEIGHT, Z_HATCH_END, zHi),
    box(C, C + 0.5, 0, HEIGHT, Z_HATCH_END, zHi),
    box(-C, C, 0, HEIGHT, CABIN.z1, zHi),
  ]
  // Sleeping bags.
  for (const b of Object.values(BAGS)) {
    const side = Math.sign(b.x)
    boxes.push(box(side > 0 ? b.x - 0.3 : b.x - 0.1, side > 0 ? b.x + 0.1 : b.x + 0.3, 0, 1.6, b.z - 0.33, b.z + 0.33))
  }
  // Left wall, solid except the bays. Each bay has a back wall.
  boxes.push(...split(zLo, Z_HATCH_END, BAYS, (a, b) => box(-3, -W, 0, HEIGHT, a, b)))
  for (const b of BAYS) boxes.push(box(-3, -BAY_DEPTH, 0, HEIGHT, b.z0, b.z1))
  // Right wall: thin, split by the doorways inside the room span, solid outside it.
  boxes.push(...split(zLo, Z_HATCH_END, DOORS, (a, b) => box(W, ROOM.x0, 0, HEIGHT, a, b)))
  // Side room shell.
  boxes.push(box(ROOM.x0, ROOM.x1 + 0.5, 0, HEIGHT, ROOM.z0 - 0.5, ROOM.z0))
  boxes.push(box(ROOM.x0, ROOM.x1 + 0.5, 0, HEIGHT, ROOM.z1, ROOM.z1 + 0.5))
  boxes.push(box(ROOM.x1, ROOM.x1 + 0.5, 0, HEIGHT, ROOM.z0, ROOM.z1))
  // Lockers.
  for (const l of LOCKERS) {
    boxes.push(box(l.center.x - LOCKER_W / 2, l.center.x + LOCKER_W / 2, 0, LOCKER_H, l.center.z - LOCKER_D / 2, l.center.z + LOCKER_D / 2))
  }
  // Cage bars: two fixed slabs and the door.
  boxes.push(box(-W, -CAGE.doorHalf, 0, HEIGHT, CAGE.z - CAGE.thick / 2, CAGE.z + CAGE.thick / 2))
  boxes.push(box(CAGE.doorHalf, W, 0, HEIGHT, CAGE.z - CAGE.thick / 2, CAGE.z + CAGE.thick / 2))
  boxes.push(cageDoorBox())
  return boxes
}

/** The checkpoint to set at this z, given the ones already passed. Returns the furthest not yet set. */
export function checkpointAt(z: number): Checkpoint | null {
  let found: Checkpoint | null = null
  for (const [cz, name] of CHECKPOINT_Z) if (z < cz) found = name
  return found
}

/** Order of checkpoints, for "only moves forward". */
export const checkpointIndex = (c: string): number => CHECKPOINTS.indexOf(c as Checkpoint)

/** The y of the floor strips, and their x offset. */
export const STRIP_X = 0.9

/** Speed in m/s from a velocity. */
export const speedOf = (v: Vec3): number => Math.hypot(v.x, v.y, v.z)

/** A bump: velocity along an axis dropped by at least 0.3 m/s in one frame. */
export function detectBump(prev: Vec3, cur: Vec3): boolean {
  return (['x', 'y', 'z'] as const).some((a) => Math.abs(prev[a]) - Math.abs(cur[a]) >= 0.3 && Math.abs(prev[a]) >= 0.3 && Math.abs(cur[a]) < Math.abs(prev[a]) * 0.5)
}

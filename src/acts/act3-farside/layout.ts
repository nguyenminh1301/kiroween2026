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
  start: { pos: { x: 0, y: 0.2, z: 2.5 }, yaw: 0, patrolS: 0 },
  wp0: { pos: { x: 0, y: 0.2, z: -4.2 }, yaw: 0, patrolS: 0 },
  wp1: { pos: { x: 0, y: 0.2, z: -12 }, yaw: 0, patrolS: 6 },
  wp2: { pos: { x: 0, y: 0.2, z: -31.5 }, yaw: 0, patrolS: 20 },
  wp3: { pos: { x: 0, y: 0.2, z: -38.5 }, yaw: Math.PI, patrolS: 0 },
}

/** Passing these z values (going to -z) sets the checkpoint. */
export const CHECKPOINT_Z: ReadonlyArray<[number, Checkpoint]> = [
  [-5, 'wp0'],
  [-12, 'wp1'],
  [-31.5, 'wp2'],
  [-38, 'wp3'],
]

export const Z_HATCH_END = 4
export const Z_FAR_END = -44
export const HALF_W = 1.2
export const HEIGHT = 2.4
export const CHAMFER = 0.5

export const HATCH_POS: Vec3 = { x: 0, y: 1.3, z: 3.9 }
export const CDR_POS: Vec3 = { x: 0.55, y: 0.3, z: 3.3 }
export const MIKE_POS: Vec3 = { x: 0.85, y: 0, z: -41.5 }
/** Where Mike's voice comes from. */
export const MIKE_HEAD: Vec3 = { x: 0.85, y: 0.9, z: -41.5 }
export const REVEAL_CREATURE_Z = -43.4

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
  inside: { x: l.cx - 0.25, y: 0.2, z: l.z },
  exit: { x: -0.6, y: 0.2, z: l.z },
  doorPos: { x: -1.28, y: 1.2, z: l.z },
}))
export const LOCKER_RADIUS = 0.55
export const LOCKER_YAW = -Math.PI / 2
export const LOCKER_EXIT_DELAY = 0.4

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

/** Collision: floor, ceiling, walls with gaps, bay walls, lockers, side room. */
export function collisionBoxes(): Box[] {
  const zLo = Z_FAR_END - 0.5
  const zHi = Z_HATCH_END + 0.5
  const W = HALF_W
  const boxes: Box[] = [
    box(-6, 6, -0.5, 0, zLo, zHi), // floor
    box(-6, 6, HEIGHT, HEIGHT + 0.5, zLo, zHi), // ceiling
    box(-W, W, 0, HEIGHT, Z_HATCH_END, zHi), // hatch end
    box(-W, W, 0, HEIGHT, zLo, Z_FAR_END), // far end
  ]
  // Left wall, solid except the bays. Each bay has a back wall.
  boxes.push(...split(zLo, zHi, BAYS, (a, b) => box(-3, -W, 0, HEIGHT, a, b)))
  for (const b of BAYS) boxes.push(box(-3, -BAY_DEPTH, 0, HEIGHT, b.z0, b.z1))
  // Right wall: thin, split by the doorways inside the room span, solid outside it.
  boxes.push(...split(zLo, zHi, DOORS, (a, b) => box(W, ROOM.x0, 0, HEIGHT, a, b)))
  // Side room shell.
  boxes.push(box(ROOM.x0, ROOM.x1 + 0.5, 0, HEIGHT, ROOM.z0 - 0.5, ROOM.z0))
  boxes.push(box(ROOM.x0, ROOM.x1 + 0.5, 0, HEIGHT, ROOM.z1, ROOM.z1 + 0.5))
  boxes.push(box(ROOM.x1, ROOM.x1 + 0.5, 0, HEIGHT, ROOM.z0, ROOM.z1))
  // Lockers.
  for (const l of LOCKERS) {
    boxes.push(box(l.center.x - LOCKER_W / 2, l.center.x + LOCKER_W / 2, 0, LOCKER_H, l.center.z - LOCKER_D / 2, l.center.z + LOCKER_D / 2))
  }
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

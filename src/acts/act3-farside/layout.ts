// Fixed positions and collision for the act 3 dream. Pure data and functions: no Three.js or React imports.
// The dream is a grid map (see `mapgrid.ts`): an entry corridor from the cabin, a junction, a jammed hatch
// straight ahead, a left loop and a right loop that meet in a hall, the approach and the cage room.
// Z runs from the cabin doorway (+4) to the cage room back wall (-33.2).
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'
import { CELL, Grid, type Pt, type Rect } from './mapgrid'

export const CHECKPOINTS = ['start', 'wp0', 'wp1', 'wp2', 'wp3'] as const
export type Checkpoint = (typeof CHECKPOINTS)[number]

export const Z_HATCH_END = 4
export const HEIGHT = 2.4
export const HALF_W = 1.2

/** The doorway between the cabin and the corridor. */
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

// ---------------------------------------------------------------------------------------------------
// The map. Columns 0 to 19, rows 0 to 30. Column 10 has its left edge at x = 0, so the entry corridor
// (columns 9 and 10) is centred on x = 0. Row 0 starts at the doorway, z = 4.

const MAP_RECTS: Rect[] = [
  { c0: 9, r0: 0, c1: 10, r1: 5 }, // entry corridor
  { c0: 4, r0: 6, c1: 15, r1: 7 }, // junction hall: where the loops split
  { c0: 9, r0: 8, c1: 10, r1: 21 }, // the straight way, jammed at the hatch
  { c0: 4, r0: 8, c1: 5, r1: 21 }, // left loop
  { c0: 14, r0: 8, c1: 15, r1: 21 }, // right loop
  { c0: 4, r0: 22, c1: 15, r1: 23 }, // the meeting hall
  { c0: 9, r0: 24, c1: 10, r1: 27 }, // approach to the cage
  { c0: 9, r0: 28, c1: 10, r1: 30 }, // cage room
  { c0: 1, r0: 9, c1: 2, r1: 12 }, // left store room
  { c0: 3, r0: 9, c1: 3, r1: 9 }, // its door
  { c0: 0, r0: 14, c1: 2, r1: 19 }, // left crew bay
  { c0: 3, r0: 15, c1: 3, r1: 16 }, // its door
  { c0: 6, r0: 18, c1: 7, r1: 19 }, // left dead end
  { c0: 17, r0: 8, c1: 18, r1: 11 }, // right store room
  { c0: 16, r0: 10, c1: 16, r1: 10 }, // its door
  { c0: 17, r0: 13, c1: 19, r1: 18 }, // right crew bay
  { c0: 16, r0: 14, c1: 16, r1: 15 }, // its door
  { c0: 12, r0: 19, c1: 13, r1: 20 }, // right dead end
]
export const GRID = new Grid(MAP_RECTS, 10, Z_HATCH_END, 20, 31)
/** Centre z of row r. */
export const rowZ = (r: number): number => Z_HATCH_END - CELL * r - CELL / 2

/** The jammed hatch on the straight way, with light under it. */
export const HATCH = { z: -10.4, halfW: HALF_W, h: 2.3, thick: 0.2 }
/** The cage bars across the approach, a door in the middle, the room behind. */
export const CAGE = { z: -29.6, backZ: -33.2, doorHalf: 0.35, thick: 0.1 }
export const CAGE_DOOR_POS: Vec3 = { x: 0, y: 1.2, z: CAGE.z }
export const CAGE_DOOR_RADIUS = 0.55
/** Neil on the left, Mike on the right, hanging from the ceiling. */
export const CAGED: Record<'cdr' | 'cmp', Vec3> = {
  cdr: { x: -0.55, y: 0, z: -31.5 },
  cmp: { x: 0.55, y: 0, z: -31.5 },
}
export const CREW_RADIUS = 0.6
/** Voice position of a caged crewman. */
export const cagedVoice = (who: 'cdr' | 'cmp'): Vec3 => ({ ...CAGED[who], y: 1.0 })
/** Z of the whole map's far edge. */
export const Z_FAR_END = CAGE.backZ

export interface CheckpointDef {
  pos: Vec3
  yaw: number
  /** Where the creature starts on its patrol, as a patrol route index. */
  patrolIndex: number
}

export const CHECKPOINT_DEFS: Record<Checkpoint, CheckpointDef> = {
  start: { pos: { x: -0.7, y: 0.2, z: 6.6 }, yaw: 0, patrolIndex: 5 },
  wp0: { pos: { x: 0, y: 0.2, z: -4.4 }, yaw: 0, patrolIndex: 5 },
  wp1: { pos: { x: 0, y: 0.2, z: -28.2 }, yaw: 0, patrolIndex: 1 },
  wp2: { pos: { x: -0.4, y: 0.2, z: 5.9 }, yaw: Math.PI / 2, patrolIndex: 3 },
  wp3: { pos: { x: 0, y: 0.2, z: -28.2 }, yaw: 0, patrolIndex: 3 },
}

/** Going to -z, passing this z sets the checkpoint. wp2 and wp3 are set by events, not by position. */
export const CHECKPOINT_Z: ReadonlyArray<[number, Checkpoint]> = [
  [-4.4, 'wp0'],
  [-28.4, 'wp1'],
]
/** Past this z (going to -z) Buzz is at the cage. */
export const CAGE_ARRIVE_Z = -28.4
/** Past this z the player is deep in the maze: the impostor line plays once. */
export const IMPOSTOR_Z = -14

// ---------------------------------------------------------------------------------------------------
// Hiding spots.

export type SpotKind = 'locker' | 'corner' | 'bag'
export interface SpotDef {
  id: string
  kind: SpotKind
  verb: 'HIDE' | 'SLEEP'
  /** The point the interactable aims at. */
  usePos: Vec3
  radius: number
  /** Feet position while hiding. */
  inside: Vec3
  yaw: number
  /** Feet position after leaving. */
  exit: Vec3
  /** Where the creature may stop and breathe. Never inside the spot. */
  outside: Pt
  /** Look limit while hiding, radians. */
  look: number
  /** The footprint the creature never enters. */
  block: Box
  /** Eye height while hiding. */
  eye: number
}

export const LOCKER_W = 0.8
export const LOCKER_D = 0.9
export const LOCKER_H = 2
export const LOCKER_RADIUS = 0.55
export const LOCKER_EXIT_DELAY = 0.4
/** Look limit inside a locker: about 30 degrees. */
export const LOCKER_LOOK_LIMIT = (30 * Math.PI) / 180
export const LOCKER_YAW = -Math.PI / 2

type Facing = 'E' | 'W' | 'N' | 'S'
const DIRS: Record<Facing, [number, number]> = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }
const yawOf = (f: Facing): number => Math.atan2(-DIRS[f][0], -DIRS[f][1])

export interface LockerDef extends SpotDef {
  facing: Facing
  /** Centre of the locker body. */
  center: Vec3
  doorPos: Vec3
}

/** A locker against a wall. (wx, wz) is the wall point at the middle of the locker, `f` the way the door faces. */
function locker(i: number, wx: number, wz: number, f: Facing): LockerDef {
  const [dx, dz] = DIRS[f]
  const cx = wx + dx * (LOCKER_W / 2)
  const cz = wz + dz * (LOCKER_W / 2)
  const eastWest = dx !== 0
  const hx = eastWest ? LOCKER_W / 2 : LOCKER_D / 2
  const hz = eastWest ? LOCKER_D / 2 : LOCKER_W / 2
  const door = { x: wx + dx * LOCKER_W, y: 1.2, z: wz + dz * LOCKER_W }
  return {
    id: `act3:locker${i}`,
    kind: 'locker',
    verb: 'HIDE',
    facing: f,
    center: { x: cx, y: LOCKER_H / 2, z: cz },
    usePos: door,
    doorPos: door,
    radius: LOCKER_RADIUS,
    inside: { x: wx + dx * 0.55, y: 0.2, z: wz + dz * 0.55 },
    yaw: yawOf(f),
    exit: { x: wx + dx * (LOCKER_W + 0.4), y: 0.2, z: wz + dz * (LOCKER_W + 0.4) },
    outside: { x: wx + dx * (LOCKER_W + 0.55), z: wz + dz * (LOCKER_W + 0.55) },
    look: LOCKER_LOOK_LIMIT,
    block: { min: { x: cx - hx, y: 0, z: cz - hz }, max: { x: cx + hx, y: LOCKER_H, z: cz + hz } },
    eye: 1.85,
  }
}

export const LOCKERS: LockerDef[] = [
  locker(0, -4.8, rowZ(12), 'W'), // left loop, east wall
  locker(1, -7.2, rowZ(18), 'E'), // left loop, west wall
  locker(2, -2.4, -18.8, 'W'), // left dead end
  locker(3, 4.8, rowZ(12), 'E'), // right loop, west wall
  locker(4, 7.2, rowZ(19), 'W'), // right loop, east wall
  locker(5, 2.4, -20.0, 'E'), // right dead end
  locker(6, -1.2, rowZ(26), 'E'), // near the cage room
]

const rectBox = (x0: number, x1: number, z0: number, z1: number, h = 2): Box => ({
  min: { x: Math.min(x0, x1), y: 0, z: Math.min(z0, z1) },
  max: { x: Math.max(x0, x1), y: h, z: Math.max(z0, z1) },
})

export interface DoorLeaf {
  /** The thin slab of the open door. */
  box: Box
}

/** An open door: a leaf swung into the room, and the dark corner behind it. */
function corner(i: number, pocket: Pt, leaf: Box, pocketBox: Box, exit: Pt, yaw: number, usePos: Vec3): SpotDef & { leaf: Box } {
  return {
    id: `act3:corner${i}`,
    kind: 'corner',
    verb: 'HIDE',
    usePos,
    radius: 0.75,
    inside: { x: pocket.x, y: 0.2, z: pocket.z },
    yaw,
    exit: { x: exit.x, y: 0.2, z: exit.z },
    outside: { x: exit.x, z: exit.z },
    look: 1.1,
    block: pocketBox,
    eye: 1.65,
    leaf,
  }
}

const LEFT_WALL_X = (3 - 10) * CELL // east wall of the left rooms, -8.4
const RIGHT_WALL_X = (17 - 10) * CELL // west wall of the right rooms, 8.4
const LEAF_LEN = 0.9

export const CORNERS = [
  corner(
    0,
    { x: LEFT_WALL_X - 0.45, z: -8.6 },
    rectBox(LEFT_WALL_X - LEAF_LEN, LEFT_WALL_X, -8.1, -8.0, 2.1),
    rectBox(LEFT_WALL_X - 1.0, LEFT_WALL_X, -9.2, -8.0),
    { x: LEFT_WALL_X - 1.5, z: -8.6 },
    Math.PI / 2,
    { x: LEFT_WALL_X - LEAF_LEN, y: 1.0, z: -8.4 },
  ),
  corner(
    1,
    { x: RIGHT_WALL_X + 0.45, z: -7.4 },
    rectBox(RIGHT_WALL_X, RIGHT_WALL_X + LEAF_LEN, -8.0, -7.9, 2.1),
    rectBox(RIGHT_WALL_X, RIGHT_WALL_X + 1.0, -8.0, -6.8),
    { x: RIGHT_WALL_X + 1.5, z: -7.4 },
    -Math.PI / 2,
    { x: RIGHT_WALL_X + LEAF_LEN, y: 1.0, z: -7.6 },
  ),
]

/** An empty sleeping bag on the wall of a crew bay. */
function bagSpot(i: number, wallX: number, z: number, into: 1 | -1): SpotDef {
  return {
    id: `act3:bag${i}`,
    kind: 'bag',
    verb: 'SLEEP',
    usePos: { x: wallX + into * 0.2, y: 1.2, z },
    radius: 0.7,
    inside: { x: wallX + into * 0.45, y: -0.45, z },
    yaw: into === 1 ? -Math.PI / 2 : Math.PI / 2,
    exit: { x: wallX + into * 1.0, y: 0.2, z },
    outside: { x: wallX + into * 1.5, z },
    look: 0.35,
    block: rectBox(wallX, wallX + into * 0.8, z - 0.4, z + 0.4),
    eye: 1.2,
  }
}
const LEFT_WALL_BAYS = -12
const RIGHT_WALL_BAYS = 12
export const BAG_SPOTS: SpotDef[] = [
  bagSpot(0, LEFT_WALL_BAYS, -13.6, 1),
  bagSpot(1, LEFT_WALL_BAYS, -18.6, 1),
  bagSpot(2, RIGHT_WALL_BAYS, -12.9, -1),
  bagSpot(3, RIGHT_WALL_BAYS, -17.4, -1),
]

/** Every hiding spot, in one list. */
export const SPOTS: SpotDef[] = [...LOCKERS, ...CORNERS, ...BAG_SPOTS]

// ---------------------------------------------------------------------------------------------------
// Collision and creature navigation.

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
})

/** The cage door as a collision slab. Removed when the cage opens. */
export const cageDoorBox = (): Box => box(-CAGE.doorHalf, CAGE.doorHalf, 0, HEIGHT, CAGE.z - CAGE.thick / 2, CAGE.z + CAGE.thick / 2)
export const hatchBox = (): Box => box(-HATCH.halfW, HATCH.halfW, 0, HEIGHT, HATCH.z - HATCH.thick / 2, HATCH.z + HATCH.thick / 2)

/** Collision: floor, ceiling, map walls, cabin, bags, lockers, door leaves, hatch and cage bars. */
export function collisionBoxes(): Box[] {
  const zLo = Z_FAR_END - 0.5
  const zHi = CABIN.z1 + 0.5
  const C = CABIN.halfW
  const boxes: Box[] = [
    box(-14, 14, -0.5, 0, zLo, zHi), // floor
    box(-14, 14, HEIGHT, HEIGHT + 0.5, zLo, zHi), // ceiling
    // Doorway wall between the corridor and the cabin.
    box(-C, -DOORWAY.halfW, 0, HEIGHT, Z_HATCH_END, Z_HATCH_END + 0.2),
    box(DOORWAY.halfW, C, 0, HEIGHT, Z_HATCH_END, Z_HATCH_END + 0.2),
    box(-DOORWAY.halfW, DOORWAY.halfW, DOORWAY.h, HEIGHT, Z_HATCH_END, Z_HATCH_END + 0.2),
    // Cabin walls.
    box(-C - 0.5, -C, 0, HEIGHT, Z_HATCH_END, zHi),
    box(C, C + 0.5, 0, HEIGHT, Z_HATCH_END, zHi),
    box(-C, C, 0, HEIGHT, CABIN.z1, zHi),
  ]
  // Sleeping bags in the cabin.
  for (const b of Object.values(BAGS)) {
    const side = Math.sign(b.x)
    boxes.push(box(side > 0 ? b.x - 0.3 : b.x - 0.1, side > 0 ? b.x + 0.1 : b.x + 0.3, 0, 1.6, b.z - 0.33, b.z + 0.33))
  }
  // The map. Its closing wall at the doorway is left out: the doorway wall above has the gap.
  boxes.push(...GRID.wallBoxes(HEIGHT).filter((b) => b.min.z < Z_HATCH_END - 1e-6))
  for (const l of LOCKERS) boxes.push(box(l.block.min.x, l.block.max.x, 0, LOCKER_H, l.block.min.z, l.block.max.z))
  for (const c of CORNERS) boxes.push(c.leaf)
  boxes.push(hatchBox())
  // Cage bars: two fixed slabs either side of the door, and the door.
  boxes.push(box(-HALF_W, -CAGE.doorHalf, 0, HEIGHT, CAGE.z - CAGE.thick / 2, CAGE.z + CAGE.thick / 2))
  boxes.push(box(CAGE.doorHalf, HALF_W, 0, HEIGHT, CAGE.z - CAGE.thick / 2, CAGE.z + CAGE.thick / 2))
  boxes.push(cageDoorBox())
  return boxes
}

/** What the creature never walks into: spots, the hatch and the cage bars. */
export function creatureBlockers(): Box[] {
  return [
    ...SPOTS.map((s) => s.block),
    ...CORNERS.map((c) => c.leaf),
    hatchBox(),
    box(-HALF_W, HALF_W, 0, HEIGHT, CAGE.z - 0.1, CAGE.z + 0.1),
  ]
}

/** The creature's radius for wall clearance. */
export const CREATURE_RADIUS = 0.35

const midRow = (a: number, b: number): number => (rowZ(a) + rowZ(b)) / 2

/** Door and corner centres the creature walks through. */
export const NAV_NODES: Record<string, Pt> = {
  entry: { x: 0, z: 2 },
  junction: { x: 0, z: -4.4 },
  hatch: { x: 0, z: -8.8 },
  leftTop: { x: -6, z: -4.4 },
  leftBottom: { x: -6, z: -23.6 },
  mid: { x: 0, z: -23.6 },
  rightBottom: { x: 6, z: -23.6 },
  rightTop: { x: 6, z: -4.4 },
  approach: { x: 0, z: -27.4 },
  // Left side rooms and dead end: the loop side of each door, the door, and a point inside.
  leftStoreLoop: { x: -6, z: rowZ(9) },
  leftStoreDoor: { x: -7.8, z: rowZ(9) },
  leftStoreIn: { x: -9.9, z: rowZ(9) },
  leftBayLoop: { x: -6, z: midRow(15, 16) },
  leftBayDoor: { x: -7.8, z: midRow(15, 16) },
  leftBayIn: { x: -10, z: midRow(15, 16) },
  leftStubLoop: { x: -6, z: midRow(18, 19) },
  leftStubEnd: { x: -3.6, z: midRow(18, 19) },
  // Right side.
  rightStoreLoop: { x: 6, z: rowZ(10) },
  rightStoreDoor: { x: 7.8, z: rowZ(10) },
  rightStoreIn: { x: 9.9, z: rowZ(10) },
  rightBayLoop: { x: 6, z: midRow(14, 15) },
  rightBayDoor: { x: 7.8, z: midRow(14, 15) },
  rightBayIn: { x: 10, z: midRow(14, 15) },
  rightStubLoop: { x: 6, z: midRow(19, 20) },
  rightStubEnd: { x: 3.6, z: midRow(19, 20) },
}

/** The creature's patrol: round the left loop, the hall, the approach, back through the hall and up the right loop. */
export const PATROL_ROUTE: Pt[] = [
  'junction',
  'leftTop',
  'leftBottom',
  'mid',
  'approach',
  'mid',
  'rightBottom',
  'rightTop',
].map((k) => NAV_NODES[k])
/** Places it looks into now and then on its patrol, in turn. */
export const PEEKS: Pt[] = ['leftStoreDoor', 'leftBayDoor', 'rightStoreDoor', 'rightBayDoor', 'leftStubEnd', 'rightStubEnd'].map((k) => NAV_NODES[k])

/** A line of sight check for the creature: keeps its radius clear of walls, spots, the hatch and the bars. */
export const creatureClear = (a: Pt, b: Pt): boolean => GRID.lineClear(a, b, CREATURE_RADIUS, creatureBlockers())

/** The checkpoint to set at this z, given the ones already passed. Returns the furthest not yet set. */
export function checkpointAt(z: number): Checkpoint | null {
  let found: Checkpoint | null = null
  for (const [cz, name] of CHECKPOINT_Z) if (z < cz) found = name
  return found
}

/** Order of checkpoints, for "only moves forward". */
export const checkpointIndex = (c: string): number => CHECKPOINTS.indexOf(c as Checkpoint)

/** Speed in m/s from a velocity. */
export const speedOf = (v: Vec3): number => Math.hypot(v.x, v.y, v.z)

/** A bump: velocity along an axis dropped by at least 0.3 m/s in one frame. */
export function detectBump(prev: Vec3, cur: Vec3): boolean {
  return (['x', 'y', 'z'] as const).some((a) => Math.abs(prev[a]) - Math.abs(cur[a]) >= 0.3 && Math.abs(prev[a]) >= 0.3 && Math.abs(cur[a]) < Math.abs(prev[a]) * 0.5)
}

/** Where a heard noise at (x, z) counts as: a player in a hiding spot is heard at its outside point. */
export function heardAt(p: Pt, spot: SpotDef | null): Pt {
  return spot ? { ...spot.outside } : { x: p.x, z: p.z }
}

// Sandbox room layout. Plain data and pure functions, no Three.js or React imports.
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
})

/** Room interior: x and z from -8 to 8, floor at y = 0, ceiling at y = 4. */
export const ROOM_HALF = 8
export const ROOM_HEIGHT = 4
const T = 0.5

export const NORTH_WALL: Box = box(-ROOM_HALF - T, 0, -ROOM_HALF - T, ROOM_HALF + T, ROOM_HEIGHT, -ROOM_HALF)
export const SOUTH_WALL: Box = box(-ROOM_HALF - T, 0, ROOM_HALF, ROOM_HALF + T, ROOM_HEIGHT, ROOM_HALF + T)
export const WEST_WALL: Box = box(-ROOM_HALF - T, 0, -ROOM_HALF, -ROOM_HALF, ROOM_HEIGHT, ROOM_HALF)
export const EAST_WALL: Box = box(ROOM_HALF, 0, -ROOM_HALF, ROOM_HALF + T, ROOM_HEIGHT, ROOM_HALF)
export const CEILING: Box = box(-ROOM_HALF - T, ROOM_HEIGHT, -ROOM_HALF - T, ROOM_HALF + T, ROOM_HEIGHT + T, ROOM_HALF + T)

/** The box the audio sandbox knocks on (key 4). */
const KNOCK_BOX: Box = box(-2.5, 0, -4, -1.5, 0.8, -3)
export const KNOCK_POS: Vec3 = { x: -2, y: 0.4, z: -3.5 }

/** Boxes to walk around. None crosses the line x = 0 on the way north from the start. */
export const OBSTACLES: Box[] = [
  box(2.5, 0, -1.5, 3.5, 1, -0.5),
  box(-3.5, 0, 0, -2.5, 2, 1),
  box(1.2, 0, -5, 2.2, 0.5, -4),
  KNOCK_BOX,
]

export const SEAT_BOX: Box = box(-5.3, 0, 4.7, -4.7, 0.5, 5.3)
export const SEAT_BACK: Box = box(-5.3, 0.5, 5.2, -4.7, 1.2, 5.3)

/** Everything the player collides with. The floor is the ground function. */
export const COLLISION_BOXES: Box[] = [
  NORTH_WALL,
  SOUTH_WALL,
  WEST_WALL,
  EAST_WALL,
  CEILING,
  ...OBSTACLES,
  SEAT_BOX,
  SEAT_BACK,
]

/** Zero-g zone volume, in the north-west corner. Big enough to hold a launch drift. */
export const ZERO_G_ZONE: Box = box(-7.5, 0, -7.5, -3, 3.8, -3)

export const PLAYER_START: Vec3 = { x: 0, y: 0, z: 6 }
export const SEAT_POS: Vec3 = { x: -5, y: -0.5, z: 5 }
/** Looking toward -Z. */
export const SEAT_FORWARD_YAW = 0
/** Where the player stands when leaving the seat. */
export const SEAT_EXIT_POS: Vec3 = { x: -5, y: 0, z: 3.8 }
export const SEAT_USE_DISTANCE = 2

export const RAMP_START_X = 4
export const RAMP_END_X = 7
export const RAMP_HEIGHT = 0.6
const RAMP_SLOPE = RAMP_HEIGHT / (RAMP_END_X - RAMP_START_X)

/** Ground height: flat, then a ramp from x = 4 to x = 7, then a flat plateau. */
export function groundHeight(x: number): number {
  if (!(x > RAMP_START_X)) return 0
  return Math.min(RAMP_HEIGHT, (x - RAMP_START_X) * RAMP_SLOPE)
}

export const RAMP_ANGLE = Math.atan(RAMP_SLOPE)

/** A wall switch on the north wall, at eye height. */
export const SWITCH_POS: Vec3 = { x: 0, y: 1.65, z: -7.85 }
export const SWITCH_RADIUS = 0.3

/** A handrail run inside the zero-g zone, along Z. */
export const RAIL_A: Vec3 = { x: -6, y: 1.2, z: -7 }
export const RAIL_B: Vec3 = { x: -6, y: 1.2, z: -4 }

/** A wrong-colored box the player can notice. Visual only. */
export const TEST_BOX_POS: Vec3 = { x: 0, y: 1, z: 2 }
export const TEST_BOX_SIZE = 0.8
export const TEST_ANOMALY_ID = 'test-box'

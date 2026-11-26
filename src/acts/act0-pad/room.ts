// Act 0 layout: walkway, White Room, collision boxes, boot prints. Plain data, no Three.js or React imports.
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'

export const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
})

export const WALK_Z_START = 6.5
export const WALK_Z_END = -6
export const ROOM_Z_END = -9
export const ROOM_HALF = 1.4
export const ROOM_HEIGHT = 2.6
export const DOOR_HALF = 0.7
export const RAIL_X = 1.0
export const RAIL_HEIGHT = 1.2

export const PLAYER_START: Vec3 = { x: 0, y: 0, z: 5 }
export const PAD0_POS: Vec3 = { x: 0.7, y: 0, z: 2.6 }
export const PAD1_POS: Vec3 = { x: 0.9, y: 0, z: -8.2 }
export const HATCH_POS: Vec3 = { x: 0, y: 1.25, z: -8.95 }
export const HATCH_RADIUS = 0.6
export const SUN_DIRECTION: Vec3 = { x: -0.6, y: 0.2, z: -1 }
export const ROOM_ENTER_Z = -6.2

export const BOOTPRINT_ANOMALY = {
  id: 'extra-bootprints',
  position: { x: 0.4, y: 0.05, z: -1 },
  radius: 1.5,
  maxDistance: 14,
}

export type MatName = 'grating' | 'steel' | 'rail' | 'room' | 'lamp'

export interface VisualBox {
  box: Box
  mat: MatName
}

const v = (b: Box, mat: MatName): VisualBox => ({ box: b, mat })

/** Where a post sits along z. */
const POSTS: number[] = []
for (let z = 6.4; z > WALK_Z_END; z -= 1.5) POSTS.push(z)

function walkway(): VisualBox[] {
  const out: VisualBox[] = [
    v(box(-1, -0.12, WALK_Z_END, 1, 0, WALK_Z_START), 'grating'),
    v(box(-1.1, -0.9, WALK_Z_END, -1, 0, WALK_Z_START), 'steel'),
    v(box(1, -0.9, WALK_Z_END, 1.1, 0, WALK_Z_START), 'steel'),
    v(box(-1.6, -1.5, WALK_Z_START, 1.6, 3.5, 8), 'steel'),
  ]
  for (let z = 6; z > WALK_Z_END; z -= 2) out.push(v(box(-1.1, -0.4, z - 0.08, 1.1, -0.12, z + 0.08), 'steel'))
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? RAIL_X - 0.01 : -RAIL_X - 0.07
    const x1 = x0 + 0.08
    out.push(v(box(x0, RAIL_HEIGHT - 0.06, WALK_Z_END, x1, RAIL_HEIGHT, WALK_Z_START), 'rail'))
    out.push(v(box(x0, 0.55, WALK_Z_END, x1, 0.6, WALK_Z_START), 'rail'))
    for (const z of POSTS) out.push(v(box(x0, 0, z - 0.04, x1, RAIL_HEIGHT, z + 0.04), 'steel'))
  }
  return out
}

function whiteRoom(): VisualBox[] {
  const wallZ = ROOM_Z_END
  return [
    v(box(-ROOM_HALF, -0.12, wallZ - 0.6, ROOM_HALF, 0, WALK_Z_END), 'room'),
    // Front wall with a 1.4 m door opening, and a lintel over it.
    v(box(-ROOM_HALF, 0, WALK_Z_END - 0.2, -DOOR_HALF, ROOM_HEIGHT, WALK_Z_END), 'room'),
    v(box(DOOR_HALF, 0, WALK_Z_END - 0.2, ROOM_HALF, ROOM_HEIGHT, WALK_Z_END), 'room'),
    v(box(-DOOR_HALF, 2.0, WALK_Z_END - 0.2, DOOR_HALF, ROOM_HEIGHT, WALK_Z_END), 'room'),
    // The side walls and ceiling run on past z = -9 to meet the curved spacecraft wall, which is the back wall.
    v(box(-ROOM_HALF - 0.2, 0, wallZ - 0.7, -ROOM_HALF, ROOM_HEIGHT + 0.2, WALK_Z_END), 'room'),
    v(box(ROOM_HALF, 0, wallZ - 0.7, ROOM_HALF + 0.2, ROOM_HEIGHT + 0.2, WALK_Z_END), 'room'),
    v(box(-ROOM_HALF - 0.2, ROOM_HEIGHT, wallZ - 0.7, ROOM_HALF + 0.2, ROOM_HEIGHT + 0.2, WALK_Z_END), 'room'),
    // Warm ceiling light.
    v(box(-0.35, ROOM_HEIGHT - 0.06, -7.75, 0.35, ROOM_HEIGHT, -7.35), 'lamp'),
  ]
}

export const VISUAL_BOXES: VisualBox[] = [...walkway(), ...whiteRoom()]

/** Everything the player collides with. The floor is the ground function (y = 0). */
export const COLLISION_BOXES: Box[] = [
  // Railings, both sides, full length.
  box(RAIL_X, 0, WALK_Z_END, RAIL_X + 0.06, RAIL_HEIGHT, WALK_Z_START),
  box(-RAIL_X - 0.06, 0, WALK_Z_END, -RAIL_X, RAIL_HEIGHT, WALK_Z_START),
  // Tower end.
  box(-1.6, 0, WALK_Z_START, 1.6, 3.5, 8),
  // White Room: front wall pieces, side walls, back wall, ceiling.
  box(-ROOM_HALF, 0, WALK_Z_END - 0.2, -DOOR_HALF, ROOM_HEIGHT, WALK_Z_END),
  box(DOOR_HALF, 0, WALK_Z_END - 0.2, ROOM_HALF, ROOM_HEIGHT, WALK_Z_END),
  box(-ROOM_HALF - 0.2, 0, ROOM_Z_END - 0.2, -ROOM_HALF, ROOM_HEIGHT + 0.2, WALK_Z_END),
  box(ROOM_HALF, 0, ROOM_Z_END - 0.2, ROOM_HALF + 0.2, ROOM_HEIGHT + 0.2, WALK_Z_END),
  box(-ROOM_HALF, 0, ROOM_Z_END - 0.2, ROOM_HALF, ROOM_HEIGHT, ROOM_Z_END),
  // The two pad crew stand still.
  box(PAD0_POS.x - 0.2, 0, PAD0_POS.z - 0.2, PAD0_POS.x + 0.2, 1.8, PAD0_POS.z + 0.2),
  box(PAD1_POS.x - 0.2, 0, PAD1_POS.z - 0.2, PAD1_POS.x + 0.2, 1.8, PAD1_POS.z + 0.2),
]

export interface Bootprint {
  x: number
  z: number
  /** Heel to toe turn about y. */
  yaw: number
}

/** Twelve prints, alternating left and right, from z = 3.5 into the White Room. None lead out. */
export function bootprints(): Bootprint[] {
  const out: Bootprint[] = []
  for (let i = 0; i < 12; i++) {
    out.push({ x: 0.4 + (i % 2 === 0 ? -0.15 : 0.15), z: 3.5 - i * 0.95, yaw: i % 2 === 0 ? 0.06 : -0.06 })
  }
  return out
}

/** True when `z` is inside the White Room. */
export function inWhiteRoom(z: number): boolean {
  return z < ROOM_ENTER_Z
}

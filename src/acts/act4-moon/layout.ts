// Act 4 layout: lander geometry, interactable spots, start poses and checkpoints.
// Pure: no Three.js or React imports.
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'
import { SITES, groundAt } from './terrain'
import type { TaskId } from './tasks'

/** `run` means: back at the ladder after the tasks. */
export const CHECKPOINTS = ['start', 'tasks', 'run'] as const
export type Checkpoint = (typeof CHECKPOINTS)[number]

/** Descent stage: octagon about 1.9 m to the flats, y 0.8 to 3.0. Ascent stage sits on top. */
export const STAGE_TOP = 3.0
export const STAGE_BOTTOM = 0.8
export const STAGE_HALF = 1.9
export const ASCENT_TOP = 5.1
export const FOOTPAD_DIST = 4.1
export const FOOTPAD_RADIUS = 0.45

export const LADDER_FOOT: Vec3 = { x: 0, y: 0.1, z: 4.3 }
export const PORCH: Vec3 = { x: 0, y: 1.6, z: 2.6 }
export const LADDER_SPOT: Vec3 = { x: 0, y: 1.1, z: 3.9 }
export const FLAG_KIT: Vec3 = { x: 0.65, y: 0.9, z: 3.6 }
export const SCOOP_SPOT: Vec3 = { x: -0.75, y: 1.7, z: 2.2 }
export const SEISMO_KIT: Vec3 = { x: -1.35, y: 1.7, z: 1.95 }
/** The marked spot next to the planted flag where Neil takes the photo. */
export const PHOTO_SPOT = { x: 0.2, z: 9.4 } as const
export const ROOF: Vec3 = { x: 1.35, y: 3.05, z: 1.35 }
/** The seated body during descent and liftoff, inside the module. */
export const SEAT_POS: Vec3 = { x: 0, y: 3.3, z: 0 }

export const RADIUS = { flagKit: 0.6, tool: 0.35, site: 0.8, ladder: 0.7 } as const

export const EVA_START = { x: 1.3, z: 6.4, yaw: 0.36 }
export const LAST_TASK: TaskId = 'seismo'

/** Yaw that faces from (fx, fz) toward (tx, tz). Yaw 0 faces -z, positive turns left. */
export const yawToward = (fx: number, fz: number, tx: number, tz: number): number => Math.atan2(-(tx - fx), -(tz - fz))

export function sitePos(task: TaskId): Vec3 {
  const s = SITES[task]
  return { x: s.x, y: groundAt(s.x, s.z), z: s.z }
}

/** Where the `run` checkpoint puts the player: on the dust by the ladder, facing it. */
export function runStart(): { pos: Vec3; yaw: number } {
  const p = { x: 0, y: groundAt(0, 5.2), z: 5.2 }
  return { pos: p, yaw: yawToward(p.x, p.z, 0, 0) }
}

/** Collision: the stage block and the four footpads. */
export function collisionBoxes(): Box[] {
  const boxes: Box[] = [
    {
      min: { x: -STAGE_HALF, y: STAGE_BOTTOM - 0.2, z: -STAGE_HALF },
      max: { x: STAGE_HALF, y: STAGE_TOP, z: STAGE_HALF },
    },
  ]
  const r = FOOTPAD_RADIUS
  for (const [x, z] of [
    [0, FOOTPAD_DIST],
    [0, -FOOTPAD_DIST],
    [FOOTPAD_DIST, 0],
    [-FOOTPAD_DIST, 0],
  ]) {
    boxes.push({ min: { x: x - r, y: 0, z: z - r }, max: { x: x + r, y: 0.3, z: z + r } })
  }
  return boxes
}

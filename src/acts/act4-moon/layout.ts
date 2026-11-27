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
/** Where the descent engine bell ends, 1.5 m wide: the plume starts here. */
export const BELL_EXIT_Y = 0.35
export const BELL_EXIT_RADIUS = 0.75
/** Where the ascent engine bell ends, under the closed bottom of the ascent stage. */
export const ASCENT_BELL_Y = 2.68
export const FOOTPAD_DIST = 4.1
export const FOOTPAD_RADIUS = 0.45

/** The porch floor, level with the top of the descent stage. */
export const PORCH_FLOOR = 3.0
export const PORCH: Vec3 = { x: 0, y: PORCH_FLOOR, z: 2.45 }
/** Nine rungs on the front leg, bottom rung 1.1 m above the footpad top. */
export const RUNGS = 9
export const RUNG_BOTTOM = 1.1
export const RUNG_STEP = 0.22
export const PAD_TOP = 0.15
export const rungY = (i: number): number => RUNG_BOTTOM + RUNG_STEP * i
/** The ladder leans out: z of rung height `y`. */
export const ladderZ = (y: number): number => 3.45 - (y - RUNG_BOTTOM) * 0.5
export const LADDER_FOOT: Vec3 = { x: 0, y: PAD_TOP, z: 4.05 }
export const LADDER_SPOT: Vec3 = { x: 0, y: 1.0, z: 4.0 }
/** The cabin end of the crawl: inside the ascent stage, behind the hatch. */
export const CABIN_EYE: Vec3 = { x: 0, y: 3.55, z: 0.5 }
export const FLAG_KIT: Vec3 = { x: 0.65, y: 0.9, z: 3.6 }
export const SCOOP_SPOT: Vec3 = { x: -0.75, y: 1.7, z: 2.2 }
export const SEISMO_KIT: Vec3 = { x: -1.35, y: 1.7, z: 1.95 }
/** The marked spot next to the planted flag where Neil takes the photo. */
export const PHOTO_SPOT = { x: 1.7, z: 9.4 } as const
/** Buzz is inside the mark when his eye is within this distance of its centre, on the ground plane. */
export const PHOTO_RING = 1.0

/** True when the eye is inside the photo mark and the view ray passes within 1.3 m of the flag top. */
export function photoAim(eye: Vec3, dir: Vec3): boolean {
  if (Math.hypot(eye.x - PHOTO_SPOT.x, eye.z - PHOTO_SPOT.z) > PHOTO_RING) return false
  const f = SITES.flag
  const c = { x: f.x, y: groundAt(f.x, f.z) + 1.0, z: f.z }
  const len = Math.hypot(dir.x, dir.y, dir.z)
  if (!(len > 0)) return false
  const ox = c.x - eye.x, oy = c.y - eye.y, oz = c.z - eye.z
  const t = (ox * dir.x + oy * dir.y + oz * dir.z) / len
  if (t <= 0) return false
  return ox * ox + oy * oy + oz * oz - t * t <= 1.3 * 1.3
}
export const ROOF: Vec3 = { x: 1.35, y: 3.05, z: 1.35 }
/** The seated body during descent and liftoff, inside the module. */
export const SEAT_POS: Vec3 = { x: 0, y: 3.3, z: 0 }

export const RADIUS = { flagKit: 0.6, tool: 0.35, site: 0.8, ladder: 0.7 } as const

/** Where the step off the footpad ends. */
export const EVA_START = { x: 0.25, z: 4.95, yaw: 0 }
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

/** Standing in the ascent stage: the floor is the porch floor, the eye is at the helmet of a standing Buzz. */
export const LM_FLOOR = PORCH_FLOOR
export const LM_EYE_HEIGHT = 1.5
export const LM_EYE: Vec3 = { x: 0.2, y: LM_FLOOR + LM_EYE_HEIGHT, z: 0.1 }
/** Ascent stage hull radii (bottom, top) and the top height. Interior walls sit 0.04 m inside. */
export const HULL_R = 1.45
export const HULL_TOP = 4.75
export const WALL_INSET = 0.04

/** A point on the inner face `k` (0 to 5) of the ascent stage at (u, v), pushed `out` metres along the face normal. */
export function faceAt(k: number, u: number, v: number, out = 0): Vec3 {
  const ring = (i: number, r: number): [number, number] => {
    const a = (i * Math.PI) / 3
    return [Math.sin(a) * r, Math.cos(a) * r]
  }
  const rLo = HULL_R - WALL_INSET
  const rHi = HULL_R * 0.82 - WALL_INSET
  const [ax, az] = ring(k, rLo)
  const [bx, bz] = ring(k + 1, rLo)
  const [cx, cz] = ring(k, rHi)
  const [dx, dz] = ring(k + 1, rHi)
  const lx = ax + (bx - ax) * u
  const lz = az + (bz - az) * u
  const tx = cx + (dx - cx) * u
  const tz = cz + (dz - cz) * u
  const ang = ((k + 0.5) * Math.PI) / 3
  return {
    x: lx + (tx - lx) * v + Math.sin(ang) * out,
    y: LM_FLOOR + (HULL_TOP - LM_FLOOR) * v,
    z: lz + (tz - lz) * v + Math.cos(ang) * out,
  }
}

/** The two front windows are the faces 5 and 0. The panels are on the rear faces 2 and 3. */
export const WINDOW_FACES = [5, 0] as const
export const WINDOW_BOX = { u0: 0.22, u1: 0.78, v0: 0.4, v1: 0.82 } as const
export const PANEL_FACES = [2, 3] as const

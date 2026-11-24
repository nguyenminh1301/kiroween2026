// Fixed positions and sizes in the cabin. Pure data: no Three.js or React imports.
import type { Vec3 } from '../../types'

export const EYE: Vec3 = { x: 0.62, y: 1.17, z: 0.45 }
/** Feet position for the seated body: the eye sits 1.65 m above it. */
export const BODY_POS: Vec3 = { x: EYE.x, y: EYE.y - 1.65, z: EYE.z }
export const START_PITCH = 0.18

export const DSKY_POS: Vec3 = { x: 0.28, y: 1.42, z: -1.02 }
export const SWITCH_POS: Vec3 = { x: 0.62, y: 1.2, z: -0.98 }
export const O2_POS: Vec3 = { x: -0.35, y: 1.5, z: -1.05 }
export const DSKY_RADIUS = 0.16
export const SWITCH_RADIUS = 0.12
export const O2_RADIUS = 0.15

export const COUCH_X = [-0.65, 0, 0.65] as const
export const HATCH_WINDOW: Vec3 = { x: 0, y: 2.6, z: 0 }
export const RIGHT_WINDOW: Vec3 = { x: 2.3, y: 1.2, z: 0 }
export const LEFT_WINDOW: Vec3 = { x: -2.3, y: 1.2, z: 0 }

/** Wall radius profile, bottom to top: [y, radius]. */
export const SHELL_PROFILE: [number, number][] = [
  [-0.8, 2.9],
  [1.8, 2.4],
  [2.6, 0.5],
]
export const SHELL_SIDES = 10

export const PANEL_COUNT = 7
export const PANEL_W = 0.6
export const PANEL_H = 0.78
export const PANEL_TILT = 0.5
export const PANEL_STEP = 0.21
export const PANEL_RADIUS = PANEL_W / PANEL_STEP
export const PANEL_CENTER_Z = -1.17
export const PANEL_CENTER_Y = 1.55

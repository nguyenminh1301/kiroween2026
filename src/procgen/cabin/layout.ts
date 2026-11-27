// Fixed positions and sizes in the cabin. Pure data: no Three.js or React imports.
import type { Vec3 } from '../../types'

/** Top of the seat cushion in the couch model. */
export const SEAT_Y = 0.45
/** The seat pan: the plane the seated crew's pelvis rests on (the hip point of the seated figures). */
export const SEAT_PAN_Y = 0.55
/** The crewmen sit with their root here (z), facing the panel. */
export const CREW_ROOT_Z = 0.62
/** Where the seated crewmen's heads are: the centre of the helmet bubble, measured from the figures in the couches. */
export const HELMET_CENTER_Y = 1.28
export const HELMET_CENTER_Z = 0.76
export const HELMET_RADIUS = 0.172
/** The front of the helmet bubble, toward the panel. */
export const HELMET_FRONT_Z = HELMET_CENTER_Z - HELMET_RADIUS
/** The player's eye: at the helmet, 0.72 m above the seat pan and 0.1 m behind the front of the helmet. */
export const EYE_ABOVE_PAN = 0.72
export const EYE_BEHIND_FRONT = 0.1
export const EYE: Vec3 = { x: 0, y: SEAT_PAN_Y + EYE_ABOVE_PAN, z: HELMET_FRONT_Z + EYE_BEHIND_FRONT }
/** Feet position for the seated body: the eye sits 1.65 m above it. */
export const BODY_POS: Vec3 = { x: EYE.x, y: EYE.y - 1.65, z: EYE.z }
/** How far in front of the eye the middle panel centre sits (with 0.2 m of height, about 1.1 m away). */
export const PANEL_AHEAD = 1.08
export const START_PITCH = 0.18
/** A seated pilot in a helmet: the same eye, kept under its old names for act 5. */
export const HELMET_EYE: Vec3 = EYE
export const HELMET_BODY_POS: Vec3 = BODY_POS

/** The spots sit where they did on the panel, moved with it: the panel centre was (y 1.55, z -1.17). */
const SPOT_DY = (EYE.y + 0.2) - 1.55
const SPOT_DZ = (EYE.z - PANEL_AHEAD) - -1.17
export const DSKY_POS: Vec3 = { x: 0.28, y: 1.42 + SPOT_DY, z: -1.02 + SPOT_DZ }
export const SWITCH_POS: Vec3 = { x: 0.62, y: 1.2 + SPOT_DY, z: -0.98 + SPOT_DZ }
export const O2_POS: Vec3 = { x: -0.35, y: 1.5 + SPOT_DY, z: -1.05 + SPOT_DZ }
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
/** The middle panel centre: 1.08 m in front of the eye and 0.2 m above it, so 1.1 m away. */
export const PANEL_CENTER_Z = EYE.z - PANEL_AHEAD
export const PANEL_CENTER_Y = EYE.y + 0.2

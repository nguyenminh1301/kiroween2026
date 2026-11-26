// The slow turn of the spacecraft: one full turn every 120 s. Pure: no Three.js or React imports.
import type { Vec3 } from '../../types'

export const SPIN_PERIOD = 120
/** How far the Earth drifts either side of the middle of its window, radians (about 3 degrees). */
export const EARTH_SWAY = 0.052

/** Yaw of the spacecraft in radians at `t` seconds of game time. */
export const spinAngle = (t: number): number => (((t % SPIN_PERIOD) + SPIN_PERIOD) % SPIN_PERIOD / SPIN_PERIOD) * 2 * Math.PI

/** Turn a direction about the vertical axis by `a` radians. */
export function turnAboutY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c }
}

/** The sideways drift of the Earth in its window at `t`: it creeps across and back once per turn. */
export const earthSway = (t: number): number => Math.sin(spinAngle(t)) * EARTH_SWAY

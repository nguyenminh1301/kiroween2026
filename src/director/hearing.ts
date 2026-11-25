// What the creature hears and sees. Pure: no Three.js or React imports.
import type { Vec3 } from '../types'

export const HEAR_RANGE = 6.5
export const SIGHT_CLOSE = 1.1
export const SIGHT_FRONT = 3.5
export const SIGHT_COS = 0.55

/** Noise level needed to be heard at `distance` metres. */
export const hearingThreshold = (distance: number): number => 0.2 + 0.04 * distance

export function canHear(noise: number, distance: number, hidden: boolean, holding: boolean): boolean {
  if (!(distance <= HEAR_RANGE)) return false
  if (hidden && holding) return false
  return noise > hearingThreshold(distance)
}

/** `heading` is the creature's facing angle in the xz plane: direction (sin h, -cos h) like yaw. */
export function canSee(creature: Vec3, heading: number, player: Vec3, hidden: boolean): boolean {
  if (hidden) return false
  const dx = player.x - creature.x
  const dz = player.z - creature.z
  const d = Math.hypot(dx, dz)
  if (d <= SIGHT_CLOSE) return true
  if (d > SIGHT_FRONT) return false
  const fx = -Math.sin(heading)
  const fz = -Math.cos(heading)
  return (dx * fx + dz * fz) / d > SIGHT_COS
}

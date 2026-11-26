// The soft walking limit around the lander. Pure: no Three.js or React imports.
import { WALK_LIMIT } from './terrain'

/** The pull back toward the lander starts here. */
export const SOFT_FROM = 70
/** Neil calls out past this distance. */
export const WARN_FROM = 74
/** Pull back, metres per second per metre past `SOFT_FROM`. */
export const PULL = 0.5

export interface Limited {
  x: number
  z: number
  /** Past the warning distance. */
  warn: boolean
}

/** Gently pulls a point back toward the lander beyond 70 m, and never lets it pass 80 m. */
export function limitPosition(x: number, z: number, dt: number): Limited {
  const d = Math.hypot(x, z)
  if (!(d > SOFT_FROM)) return { x, z, warn: false }
  const pulled = d - (d - SOFT_FROM) * Math.min(1, PULL * Math.max(0, dt))
  const nd = Math.min(WALK_LIMIT, pulled)
  const k = nd / d
  return { x: x * k, z: z * k, warn: d > WARN_FROM }
}

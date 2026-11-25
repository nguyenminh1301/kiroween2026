// Flashlight rules for act 3. Pure functions: no Three.js or React imports.
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'

export const FLASH_FULL = 14

/** Distance along a ray to the nearest box, or `max` when nothing is hit. Slab test. */
export function rayBoxDistance(o: Vec3, d: Vec3, boxes: Box[], max: number): number {
  let best = max
  for (const b of boxes) {
    let t0 = 0
    let t1 = best
    let hit = true
    for (const a of ['x', 'y', 'z'] as const) {
      if (Math.abs(d[a]) < 1e-9) {
        if (o[a] < b.min[a] || o[a] > b.max[a]) {
          hit = false
          break
        }
        continue
      }
      let ta = (b.min[a] - o[a]) / d[a]
      let tb = (b.max[a] - o[a]) / d[a]
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 > t1) {
        hit = false
        break
      }
    }
    if (hit && t0 < best) best = t0
  }
  return best
}

/** 0.2 to 1: how much of the full beam to use when the nearest surface is `dist` metres ahead. */
export function nearStrength(dist: number): number {
  const t = Math.min(1, Math.max(0, (dist - 0.6) / 3.4))
  return 0.2 + 0.8 * (t * t * (3 - 2 * t))
}

/** Beam intensity: off while hidden in a locker, softened near surfaces. */
export function flashIntensity(hidden: boolean, dist: number): number {
  return hidden ? 0 : FLASH_FULL * nearStrength(dist)
}

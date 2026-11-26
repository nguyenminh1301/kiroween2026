// Zero g drift of a tethered item: a slow sine on three axes, never farther than the tether allows.
// Pure: no Three.js or React imports.
import type { Vec3 } from '../../types'

/** Offset from the rest point of item `seed` at time `t` seconds. Its length never exceeds `reach`. */
export function driftOffset(seed: number, t: number, reach: number): Vec3 {
  const a = 0.31 + (seed % 5) * 0.07
  const b = 0.23 + (seed % 7) * 0.05
  const c = 0.37 + (seed % 3) * 0.09
  const v = {
    x: Math.sin(t * a + seed * 1.3),
    y: Math.sin(t * b + seed * 2.1),
    z: Math.sin(t * c + seed * 0.7),
  }
  // Scale so the vector stays inside the tether sphere.
  const k = reach / Math.sqrt(3)
  return { x: v.x * k, y: v.y * k, z: v.z * k }
}

/** Slow tumble angles for the same item. */
export function driftSpin(seed: number, t: number): Vec3 {
  return { x: t * (0.15 + (seed % 3) * 0.05), y: t * (0.1 + (seed % 4) * 0.04), z: Math.sin(t * 0.3 + seed) * 0.6 }
}

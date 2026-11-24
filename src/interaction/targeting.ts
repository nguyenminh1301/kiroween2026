// Pure target picking. No Three.js or React imports.
import type { Vec3 } from '../types'

export const DEFAULT_REACH = 2.5

export interface Pickable {
  id: string
  position: Vec3
  radius: number
  enabled(): boolean
  /** Reach in metres from the eye. Defaults to 2.5. */
  reach?: number
}

/** Distance along the ray where it first touches the sphere, or null for a miss. `dir` need not be unit length. */
export function rayHitDistance(eye: Vec3, dir: Vec3, center: Vec3, radius: number): number | null {
  const len = Math.hypot(dir.x, dir.y, dir.z)
  if (!(len > 0) || !(radius >= 0)) return null
  const dx = dir.x / len
  const dy = dir.y / len
  const dz = dir.z / len
  const ox = center.x - eye.x
  const oy = center.y - eye.y
  const oz = center.z - eye.z
  const t = ox * dx + oy * dy + oz * dz
  const d2 = ox * ox + oy * oy + oz * oz - t * t
  const r2 = radius * radius
  if (d2 > r2) return null
  const h = Math.sqrt(r2 - d2)
  if (t + h < 0) return null
  return Math.max(0, t - h)
}

/** The nearest enabled item the view ray hits within its reach, or null. */
export function pickTarget<T extends Pickable>(
  eye: Vec3,
  dir: Vec3,
  items: readonly T[],
  defaultReach: number = DEFAULT_REACH,
): T | null {
  let best: T | null = null
  let bestT = Infinity
  for (const item of items) {
    if (!item.enabled()) continue
    const t = rayHitDistance(eye, dir, item.position, item.radius)
    if (t === null || t > (item.reach ?? defaultReach)) continue
    if (t < bestT) {
      best = item
      bestT = t
    }
  }
  return best
}

/** Closest point to `p` on the segment a to b. */
export function nearestOnSegment(p: Vec3, a: Vec3, b: Vec3): Vec3 {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const abz = b.z - a.z
  const len2 = abx * abx + aby * aby + abz * abz
  const raw = len2 > 0 ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / len2 : 0
  const u = Math.min(1, Math.max(0, raw))
  return { x: a.x + abx * u, y: a.y + aby * u, z: a.z + abz * u }
}

/** View direction for a yaw and pitch. Yaw 0 looks toward -Z. */
export function viewDirection(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch)
  return { x: -Math.sin(yaw) * c, y: Math.sin(pitch), z: -Math.cos(yaw) * c }
}

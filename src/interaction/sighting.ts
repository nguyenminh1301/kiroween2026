// Pure anomaly sighting accumulation. No Three.js or React imports.
import type { Vec3 } from '../types'

export const CONE_DEGREES = 25
export const SIGHT_SECONDS = 0.6

export interface Sighting {
  id: string
  position: Vec3
  radius: number
  maxDistance: number
}

/** True when the sighting is in range and inside the view cone (its angular radius counts). */
export function isSighted(eye: Vec3, dir: Vec3, s: Sighting): boolean {
  const len = Math.hypot(dir.x, dir.y, dir.z)
  const ox = s.position.x - eye.x
  const oy = s.position.y - eye.y
  const oz = s.position.z - eye.z
  const dist = Math.hypot(ox, oy, oz)
  if (!(len > 0) || dist > s.maxDistance) return false
  if (dist <= s.radius) return true
  const cos = (ox * dir.x + oy * dir.y + oz * dir.z) / (dist * len)
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)))
  const angular = Math.asin(Math.min(1, s.radius / dist))
  return angle - angular <= (CONE_DEGREES * Math.PI) / 180
}

export interface SightingTracker {
  add(s: Sighting): () => void
  /** Advance by dt. Returns the ids that crossed the threshold this call. */
  update(dt: number, eye: Vec3, dir: Vec3): string[]
  size(): number
}

export function createSightingTracker(threshold: number = SIGHT_SECONDS): SightingTracker {
  const entries = new Map<Sighting, number>()
  const done = new Set<string>()
  return {
    add(s) {
      entries.set(s, 0)
      return () => {
        entries.delete(s)
      }
    },
    update(dt, eye, dir) {
      const out: string[] = []
      for (const [s, acc] of [...entries]) {
        if (done.has(s.id)) continue
        if (!isSighted(eye, dir, s)) continue
        const next = acc + Math.max(0, dt)
        if (next >= threshold) {
          done.add(s.id)
          entries.delete(s)
          out.push(s.id)
        } else entries.set(s, next)
      }
      return out
    },
    size: () => entries.size,
  }
}

// Pure crowd rules for act 0. No Three.js or React imports.
import type { Vec3 } from '../../types'

export const MURMUR = 0.15
export const ROAR = 1
export const DECAY_SECONDS = 15

/** True when the view looks down over either railing: y < -0.2 and |x| > 0.4. */
export function crowdAim(dir: Vec3): boolean {
  return dir.y < -0.2 && Math.abs(dir.x) > 0.4
}

/** Excitement falls from 1 back to the murmur level in about 15 s, never below it. */
export function decayExcitement(e: number, dt: number): number {
  const next = e - ((ROAR - MURMUR) / DECAY_SECONDS) * Math.max(0, dt)
  return Math.min(ROAR, Math.max(MURMUR, Number.isFinite(next) ? next : MURMUR))
}

/** Chance per second that a given spectator's camera flashes. */
export function flashRate(excitement: number): number {
  return 0.01 + 0.2 * excitement * excitement
}

/** Seconds between crowd cheers: 9 s, or 7 s after the wave. */
export function cheerPeriod(waved: boolean): number {
  return waved ? 7 : 9
}

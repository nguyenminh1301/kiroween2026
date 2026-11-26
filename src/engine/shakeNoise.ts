// Shared cabin shake: smooth noise at 8 to 14 Hz, capped at 0.4 degrees of rotation and 1 cm of offset.
// The launch and the re-entry use the same cap. Pure: no Three.js or React imports.
import type { ShakeSample } from './cameraShake'

export const MAX_ROT = (0.4 * Math.PI) / 180
export const MAX_OFFSET = 0.01

const FREQ = [8.3, 9.7, 11.1, 12.6, 13.7, 10.4] as const
const FREQ2 = [8.9, 10.2, 12.1, 13.3, 8.6, 11.8] as const
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** A smooth value in -1..1 for channel `i` at time `t`. */
export function noise(i: number, t: number): number {
  return 0.5 * Math.sin(2 * Math.PI * FREQ[i] * t + i * 1.7) + 0.5 * Math.sin(2 * Math.PI * FREQ2[i] * t + i * 0.6)
}

/** The shake for strength `envelope` at time `t`. Reduced motion gives none. */
export function shakeSample(envelope: number, t: number, reducedMotion: boolean): ShakeSample {
  const e = reducedMotion ? 0 : clamp01(envelope)
  return {
    rx: noise(0, t) * MAX_ROT * e,
    ry: noise(1, t) * MAX_ROT * e,
    rz: noise(2, t) * MAX_ROT * e,
    ox: noise(3, t) * MAX_OFFSET * e,
    oy: noise(4, t) * MAX_OFFSET * e,
    oz: noise(5, t) * MAX_OFFSET * e,
  }
}

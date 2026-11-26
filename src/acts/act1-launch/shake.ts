// Act 1 camera shake. Smooth noise at 8 to 14 Hz, capped at 0.4 degrees of rotation and 1 cm of offset.
// Pure: no Three.js or React imports.
import type { ShakeSample } from '../../engine/cameraShake'
import { IGNITION_AT, LIFTOFF_AT, MAXQ_AT, ORBIT_AT, STAGING_AT, THIRD_STAGE_AT } from './timelines'

export const MAX_ROT = (0.4 * Math.PI) / 180
export const MAX_OFFSET = 0.01
/** Hold the strong shake this long after liftoff, then ease to the climb level. */
export const STRONG_SECONDS = 10

const FREQ = [8.3, 9.7, 11.1, 12.6, 13.7, 10.4] as const
const FREQ2 = [8.9, 10.2, 12.1, 13.3, 8.6, 11.8] as const
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Shake strength per beat: [time, strength] keys, linear between them. The caps in `shakeSample` still apply. */
const KEYS: readonly (readonly [number, number])[] = [
  [IGNITION_AT, 0],
  [LIFTOFF_AT, 0.3],
  [LIFTOFF_AT + 0.5, 0.8],
  [LIFTOFF_AT + STRONG_SECONDS, 0.8],
  [LIFTOFF_AT + STRONG_SECONDS + 4, 0.5],
  [MAXQ_AT - 8, 0.5],
  [MAXQ_AT, 0.8],
  [MAXQ_AT + 6, 0.5],
  [STAGING_AT - 2, 0.4],
  [STAGING_AT - 0.5, 0.3],
  [STAGING_AT + 1, 0.3],
  [THIRD_STAGE_AT, 0.2],
  [ORBIT_AT, 0.1],
  [ORBIT_AT + 3, 0],
]

/** Shake strength 0 to 1 for the launch timeline at `t`. */
export function launchEnvelope(t: number): number {
  if (t <= KEYS[0][0]) return 0
  let e = 0
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, e1] = KEYS[i]
    if (t <= t1) {
      const [t0, e0] = KEYS[i - 1]
      e = e0 + (e1 - e0) * clamp01((t - t0) / (t1 - t0))
      break
    }
  }
  // Short bump at staging, 0.4 s.
  const b = t - STAGING_AT
  if (b >= 0 && b < 0.4) e += 0.2 * (1 - b / 0.4)
  return clamp01(e)
}

/** The TLI burn: a gentle shake while the engine runs. */
export function tliEnvelope(t: number): number {
  if (t < 0.2 || t > 6.5) return 0
  return 0.25 * clamp01((t - 0.2) / 0.8) * clamp01((6.5 - t) / 0.7)
}

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

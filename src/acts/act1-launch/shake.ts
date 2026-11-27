// Act 1 camera shake. Smooth noise at 8 to 14 Hz, capped at 0.4 degrees of rotation and 1 cm of offset.
// Pure: no Three.js or React imports.
import { IGNITION_AT, LIFTOFF_AT, MAXQ_AT, ORBIT_AT, STAGING_AT, THIRD_STAGE_AT } from './timelines'

export { MAX_OFFSET, MAX_ROT, noise, shakeSample } from '../../engine/shakeNoise'
/** Hold the strong shake this long after liftoff, then ease to the climb level. */
export const STRONG_SECONDS = 4

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Shake strength per beat: [time, strength] keys, linear between them. The caps in `shakeSample` still apply. */
const KEYS: readonly (readonly [number, number])[] = [
  [IGNITION_AT, 0],
  [LIFTOFF_AT, 0.3],
  [LIFTOFF_AT + 0.5, 0.8],
  [LIFTOFF_AT + STRONG_SECONDS, 0.6],
  [MAXQ_AT, 0.8],
  [STAGING_AT - 0.5, 0.3],
  [STAGING_AT + 1, 0.3],
  [THIRD_STAGE_AT, 0.2],
  [ORBIT_AT, 0],
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

// Liftoff flame numbers: five F-1 plumes, how long they are, and how much of the flame goes into the trench.
// Pure: no Three.js or React imports.
import { IGNITION_AT, LIFTOFF_AT, rocketHeight } from './timelines'

/** First stage diameter in metres. */
export const STAGE_WIDTH = 10
/** Engine x and z in metres: one centre engine and four outer ones. */
export const ENGINE_OFFSETS: readonly (readonly [number, number])[] = [
  [0, 0],
  [2.7, 2.7],
  [-2.7, 2.7],
  [2.7, -2.7],
  [-2.7, -2.7],
]
/** Radius of one plume at its bell and at its far end, for a fully grown plume. */
export const PLUME_R_TOP = 1.6
export const PLUME_R_END = 2.3
/** Length of the plume while the rocket is still at the pad, and fully grown (about the first stage length). */
export const PLUME_MIN_LENGTH = 14
export const PLUME_MAX_LENGTH = 42
/** Height above the pad where the flame has fully left the trench. */
export const CLEAR_HEIGHT = 70

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const smooth = (x: number): number => {
  const k = clamp01(x)
  return k * k * (3 - 2 * k)
}

/** Overall width of the merged plume right below the bells. */
export function widthAtBells(): number {
  return 2 * Math.max(...ENGINE_OFFSETS.map(([x, z]) => Math.hypot(x, z) + PLUME_R_TOP))
}

/** Plume length at rocket height `h` and engine level 0 to 1. */
export function plumeLength(h: number, level: number): number {
  const base = PLUME_MIN_LENGTH + (PLUME_MAX_LENGTH - PLUME_MIN_LENGTH) * smooth(h / CLEAR_HEIGHT)
  return base * clamp01(level)
}

/** Share of the flame that goes down into the trench: 1 on the pad, 0 once clear. */
export function trenchFraction(h: number): number {
  return 1 - smooth(h / CLEAR_HEIGHT)
}

/** How hard the trench pours out clouds at launch time `t`. */
export function trenchEmission(t: number): number {
  if (t < IGNITION_AT) return 0
  const ramp = clamp01((t - IGNITION_AT) / (LIFTOFF_AT - IGNITION_AT + 0.5))
  return ramp * trenchFraction(rocketHeight(t))
}

/** Per-plume length flicker around 1, 0 when `k` is 0 (reduced motion). */
export function flicker(t: number, i: number, k: number): number {
  return 1 + (Math.sin(t * 47 + i * 2.1) * 0.07 + Math.sin(t * 31 + i * 5.3) * 0.05) * k
}

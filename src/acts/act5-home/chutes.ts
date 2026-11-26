// The parachute sequence as pure functions of timeline time. Positions are metres from the capsule's top.
// Pop the cover, shoot two drogues, cut them, pull out three mains in two steps, release at splashdown.
// No Three.js or React imports.
import type { Vec3 } from '../../types'

export const COVER_AT = 21
export const DROGUE_AT = 21.15
/** Seconds the drogues take to run out on their lines. */
export const DROGUE_SHOOT = 0.9
/** The jerk: the drogues fill with air. */
export const DROGUE_JERK_AT = DROGUE_AT + DROGUE_SHOOT + 0.25
export const DROGUE_LINE = 24
export const CUT_AT = 28.2
export const PILOT_AT = 28.2
export const MAINS_START = 28.2
/** First step: reefed, a narrow shape. */
export const REEF_AT = 29.4
export const REEF = 0.3
/** Second step: fully open. Eight seconds after the pilots fire. */
export const FULL_FROM = 32.2
export const FULL_AT = 36.2
export const RELEASE_AT = 45
export const LAND_SECONDS = 9
export const SINK_RATE = 0.05
export const MAIN_HEIGHT = 30

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const smooth = (x: number): number => {
  const c = clamp01(x)
  return c * c * (3 - 2 * c)
}

/** The top cover: flies up and away, tumbling, visible for 3 s after it pops. Null before and after. */
export function coverAt(t: number): { pos: Vec3; spin: number } | null {
  const u = t - COVER_AT
  if (u < 0 || u > 3) return null
  return { pos: { x: 2.2 * u, y: 2 + 9 * u - 5.5 * u * u, z: -1.4 * u }, spin: u * 9 }
}

/** How far the drogue lines have run out, 0 to 1. */
export const drogueRun = (t: number): number => smooth((t - DROGUE_AT) / DROGUE_SHOOT)

/**
 * Drogue canopy fill: a thin streamer at first, then a jerk open with a small overshoot, then 1.
 * 0 before the jerk, about 1.18 at the peak, settles to 1.
 */
export function drogueFill(t: number): number {
  const u = t - DROGUE_JERK_AT
  if (u < 0) return 0.18
  // A damped spring from the thin streamer: it snaps open, overshoots about 18 percent, and settles.
  return 1 - 0.82 * Math.exp(-u * 7) * Math.cos(u * 14)
}

/** The drogues are in use from the pop until 0.0 seconds after the cut, then they fall away for 2.5 s. */
export function drogueState(t: number): 'hidden' | 'out' | 'falling' {
  if (t < DROGUE_AT) return 'hidden'
  if (t < CUT_AT) return 'out'
  return t < CUT_AT + 2.5 ? 'falling' : 'hidden'
}

/** Where drogue `side` (-1 or 1) is, from the capsule top. */
export function droguePos(t: number, side: number): Vec3 {
  const run = drogueRun(t)
  const x = side * (0.4 + 4.6 * run)
  const y = 2 + (DROGUE_LINE - 2) * run
  if (t < CUT_AT) return { x, y: y + 0.25 * Math.sin(t * 3 + side), z: 0 }
  const u = t - CUT_AT
  return { x: x + side * 5 * u, y: y - 7 * u * u, z: -3 * u }
}

/** A jerk on the capsule from the canopy openings: small, damped, in metres. */
export function openingJerk(t: number): number {
  const hit = (at: number, size: number): number => {
    const u = t - at
    return u < 0 ? 0 : -size * Math.exp(-u * 4.5) * Math.sin(Math.min(u, 0.35) / 0.35 * Math.PI)
  }
  return hit(DROGUE_JERK_AT, 0.45) + hit(REEF_AT - 0.3, 0.35) + hit(FULL_FROM + 1.5, 0.3)
}

/** Main chute opening, 0 to 1, in two steps over 8 s: reefed (0.3) by 29.4 s, full from 32.2 s to 36.2 s. */
export function mainsOpen(t: number): number {
  if (t < MAINS_START) return 0
  if (t < FULL_FROM) return REEF * smooth((t - MAINS_START) / (REEF_AT - MAINS_START))
  return REEF + (1 - REEF) * smooth((t - FULL_FROM) / (FULL_AT - FULL_FROM))
}

/** Pilot chutes: out on their lines from 28.2 s, gone once the mains are filling. Returns 0 to 1 of the run, or null. */
export function pilotRun(t: number): number | null {
  if (t < PILOT_AT || t > FULL_FROM + 1) return null
  return smooth((t - PILOT_AT) / 0.6)
}

/** Canopy shape for an opening level: radius scale and height scale. Narrow and tall when reefed. */
export function canopyShape(open: number): { xz: number; y: number; spread: number } {
  const f = clamp01(open)
  return { xz: 0.22 + 0.78 * f, y: 1.18 - 0.18 * f, spread: f }
}

/** Slow breathing of a full canopy, a scale factor close to 1. */
export const breathe = (t: number, i: number, open: number): number => 1 + 0.035 * Math.sin(t * 1.15 + i * 2.1) * clamp01((open - 0.9) / 0.1)

/** Sway of the whole set of mains, radians. */
export const sway = (t: number): number => 0.045 * Math.sin(t * 0.62) + 0.018 * Math.sin(t * 1.4 + 1)

/** Capsule swing under the canopies, radians. It counters the sway a little. */
export const swing = (t: number): number => -0.07 * Math.sin(t * 0.62 - 0.4) + 0.025 * Math.sin(t * 1.7)

/** 0 while attached, then 0 to 1 over the fall. */
export const releaseFall = (t: number): number => clamp01((t - RELEASE_AT) / LAND_SECONDS)

/** The released main `i` (0 to 2): where it is, relative to the capsule's splash point, and how flat it is. */
export function releasedAt(t: number, i: number, start: Vec3): { pos: Vec3; flat: number; landed: boolean; sunk: number } {
  const f = releaseFall(t)
  const e = smooth(f)
  // Down and to one side: the wind takes them toward +x and a little to +z.
  const drift = { x: 24 + i * 7, z: 6 + i * 9 - 8 }
  const landed = f >= 1
  const sunk = Math.max(0, (t - RELEASE_AT - LAND_SECONDS) * SINK_RATE)
  return {
    pos: {
      x: start.x + (drift.x - start.x) * e,
      y: start.y * (1 - f * f) + 0.2 * f * f,
      z: start.z + (drift.z - start.z) * e,
    },
    flat: smooth(f * 1.4),
    landed,
    sunk,
  }
}

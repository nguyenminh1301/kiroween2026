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
/** Real sizes: each main is about 25 m across, each drogue about 5 m, on lines about 30 m long. */
export const MAIN_DIAMETER = 25
export const DROGUE_DIAMETER = 5
export const LINE_LENGTH = 30
/** Main canopies per set. */
export const MAIN_COUNT = 3
/**
 * The three mains fly as a triangle seen from below. Each canopy has its own gather point, `GATHER_Y` above the
 * capsule top and `GATHER_RADIUS` out from its axis, and its own riser down to the top of the capsule.
 * The canopies tilt a little outward from each other, as real clusters do.
 */
export const GATHER_Y = 6
export const GATHER_RADIUS = 7.5
export const MAIN_TILT = 0.26
/** Where the risers meet the capsule, metres from its axis. */
export const RISER_BASE_RADIUS = 0.5
/** Line and riser widths in metres, thick enough to read at 640 x 360 in the outside shots. */
export const MAIN_LINE_WIDTH = 0.25
export const RISER_WIDTH = 0.5
export const DROGUE_LINE_WIDTH = 0.2

export interface MainPose {
  /** Where this canopy's lines gather. */
  gather: Vec3
  /** Unit vector along the canopy axis, from the gather point up through the dome. */
  axis: Vec3
  /** Centre of the rim. */
  rim: Vec3
  rimRadius: number
  /** Line length from the gather point to the rim. */
  line: number
}

/** Bearing of main `i` around the vertical axis. Main 0 faces +z. */
export const mainAngle = (i: number): number => Math.PI / 2 + (i * 2 * Math.PI) / MAIN_COUNT

export function gatherPoint(i: number): Vec3 {
  const a = mainAngle(i)
  return { x: GATHER_RADIUS * Math.cos(a), y: GATHER_Y, z: GATHER_RADIUS * Math.sin(a) }
}

/** Where main `i`'s riser meets the capsule top. */
export function riserBase(i: number): Vec3 {
  const a = mainAngle(i)
  return { x: RISER_BASE_RADIUS * Math.cos(a), y: 0, z: RISER_BASE_RADIUS * Math.sin(a) }
}

/**
 * Main `i` with its rim at `scale` of full radius and its outward tilt at `spread` (0 reefed, 1 full).
 * Every line is `LINE_LENGTH` long, so a narrow reefed canopy sits higher than a full one.
 */
export function mainPose(i: number, scale: number, spread: number): MainPose {
  const rimRadius = (MAIN_DIAMETER / 2) * Math.max(0, Math.min(1.2, scale))
  const d = Math.sqrt(LINE_LENGTH * LINE_LENGTH - rimRadius * rimRadius)
  const tilt = MAIN_TILT * Math.min(1, Math.max(0, spread))
  const a = mainAngle(i)
  const axis = { x: Math.sin(tilt) * Math.cos(a), y: Math.cos(tilt), z: Math.sin(tilt) * Math.sin(a) }
  const gather = gatherPoint(i)
  return {
    gather,
    axis,
    rim: { x: gather.x + axis.x * d, y: gather.y + axis.y * d, z: gather.z + axis.z * d },
    rimRadius,
    line: LINE_LENGTH,
  }
}

/** Point `k` of `n` on the rim of a posed canopy. */
export function rimPoint(pose: MainPose, k: number, n: number): Vec3 {
  const { axis } = pose
  // u = axis x z and w = axis x u: two unit vectors in the rim plane.
  const ul = Math.hypot(axis.x, axis.y) || 1
  const ux = axis.y / ul
  const uy = -axis.x / ul
  const wx = -axis.z * uy
  const wy = axis.z * ux
  const wz = axis.x * uy - axis.y * ux
  const ang = (k / n) * Math.PI * 2
  const c = Math.cos(ang) * pose.rimRadius
  const sn = Math.sin(ang) * pose.rimRadius
  return { x: pose.rim.x + ux * c + wx * sn, y: pose.rim.y + uy * c + wy * sn, z: pose.rim.z + wz * sn }
}

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

/** Seconds the drogues stay reefed, partly open, before they fill. */
export const DROGUE_REEF_HOLD = 0.9
export const DROGUE_REEFED = 0.45

/**
 * Drogue canopy fill: a thin streamer while the lines run out, a reefed moment, then a snap to fully open
 * with a small overshoot, then 1.
 */
export function drogueFill(t: number): number {
  const u = t - DROGUE_JERK_AT
  if (u < 0) return 0.18
  if (u < DROGUE_REEF_HOLD) return DROGUE_REEFED
  const v = u - DROGUE_REEF_HOLD
  return 1 - (1 - DROGUE_REEFED) * Math.exp(-v * 7) * Math.cos(v * 14)
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
  return hit(DROGUE_JERK_AT, 0.3) + hit(DROGUE_JERK_AT + DROGUE_REEF_HOLD, 0.45) + hit(REEF_AT - 0.3, 0.35) + hit(FULL_FROM + 1.5, 0.3)
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
  const drift = { x: 30 + i * 4, z: -26 + i * 26 }
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

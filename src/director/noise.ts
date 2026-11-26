// Player noise, 0 to 1. Pure: no Three.js or React imports.

export const NOISE_DECAY = 0.3
/** Extra decay per second while standing still. */
export const STILL_DECAY = 0.7
/** The small noise of leaving a hiding spot. */
export const LEAVE_NOISE = 0.28
export const PUSH_NOISE = 0.2
export const BUMP_NOISE = 0.3
export const BREATH_FLOOR = 0.12
export const HOLD_CAP = 0.1
export const STILL_SPEED = 0.05
/** Noise floor while moving on foot, and while carrying someone. */
export const WALK_NOISE = 0.3
export const CARRY_NOISE = 0.45

export interface NoiseInput {
  dt: number
  /** Body speed in m/s. */
  speed: number
  /** A handrail push happened this frame. */
  pushed: boolean
  /** A wall bump happened this frame. */
  bumped: boolean
  /** The player is holding their breath. */
  holding: boolean
  /** On foot: every step makes noise. Other acts leave this out. */
  gait?: 'walk' | 'carry'
}

const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

/** The noise after one frame. */
export function stepNoise(noise: number, i: NoiseInput): number {
  const dt = Number.isFinite(i.dt) ? Math.max(0, i.dt) : 0
  const speed = Number.isFinite(i.speed) ? Math.max(0, i.speed) : 0
  const decay = speed < STILL_SPEED ? NOISE_DECAY + STILL_DECAY : NOISE_DECAY
  let n = clamp01(noise) - decay * dt
  if (i.pushed) n += PUSH_NOISE
  if (i.bumped) n += BUMP_NOISE
  n = clamp01(n)
  if (speed >= STILL_SPEED) n = Math.max(n, Math.min(0.6, speed * 0.1))
  if (i.gait && speed >= STILL_SPEED) n = Math.max(n, i.gait === 'carry' ? CARRY_NOISE : WALK_NOISE)
  if (!i.holding) n = Math.max(n, BREATH_FLOOR)
  if (i.holding && speed < STILL_SPEED && !i.pushed) n = Math.min(n, HOLD_CAP)
  return clamp01(n)
}

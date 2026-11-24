import type { Vec3 } from '../types'

export interface FocusState {
  active: boolean
  hold: boolean
  startYaw: number
  startPitch: number
  targetFn: () => Vec3
  seconds: number
  elapsed: number
}

export interface FocusStep {
  state: FocusState
  yaw: number
  pitch: number
  active: boolean
}

const TAU = Math.PI * 2

/** Wrap an angle difference into [-PI, PI], so turns take the shorter way. */
export function shortestAngle(delta: number): number {
  let d = delta % TAU
  if (d > Math.PI) d -= TAU
  else if (d < -Math.PI) d += TAU
  return d
}

/** Yaw and pitch that face `target` from `eye`. Forward is (-sin yaw, 0, -cos yaw). */
export function directionTo(eye: Vec3, target: Vec3): { yaw: number; pitch: number } {
  const dx = target.x - eye.x
  const dy = target.y - eye.y
  const dz = target.z - eye.z
  const flat = Math.hypot(dx, dz)
  if (flat === 0 && dy === 0) return { yaw: 0, pitch: 0 }
  return { yaw: flat === 0 ? 0 : Math.atan2(-dx, -dz), pitch: Math.atan2(dy, flat) }
}

function smooth(u: number): number {
  return u * u * (3 - 2 * u)
}

/**
 * Begin a Focus from the current, possibly mid-turn, view.
 * Calling this while another Focus runs replaces it.
 */
export function startFocus(
  current: { yaw: number; pitch: number },
  targetFn: () => Vec3,
  seconds = 2,
  hold = false,
): FocusState {
  return {
    active: true,
    hold,
    startYaw: current.yaw,
    startPitch: current.pitch,
    targetFn,
    seconds,
    elapsed: 0,
  }
}

/**
 * Advance a Focus by `dt` seconds. The target is read again on every call.
 * `eye` is the eye position the view turns from.
 */
export function stepFocus(state: FocusState, dt: number, eye: Vec3): FocusStep {
  if (!state.active) {
    return { state, yaw: state.startYaw, pitch: state.startPitch, active: false }
  }
  const elapsed = state.elapsed + Math.max(0, dt)
  const u = state.seconds > 0 ? Math.min(elapsed / state.seconds, 1) : 1
  const e = smooth(u)
  const goal = directionTo(eye, state.targetFn())
  const yaw = state.startYaw + shortestAngle(goal.yaw - state.startYaw) * e
  const pitch = state.startPitch + (goal.pitch - state.startPitch) * e
  const active = state.hold ? true : elapsed < state.seconds
  return { state: { ...state, elapsed, active }, yaw, pitch, active }
}

/** End a Focus so mouse look works again. */
export function clearFocus(state: FocusState): FocusState {
  return { ...state, active: false }
}

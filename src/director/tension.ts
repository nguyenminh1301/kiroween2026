// Tension state machine, fear and heart rate. Pure: no Three.js or React imports.
import type { TensionState } from '../types'

export type TensionEvent = 'calm' | 'unease' | 'stalk' | 'heard' | 'chaseStart' | 'chaseEnd'

export const FEAR_TARGET: Record<TensionState, number> = {
  CALM: 0,
  UNEASE: 0.25,
  STALK: 0.55,
  CHASE: 0.9,
  RELEASE: 0.4,
}

export const FEAR_RATE = 0.3
export const RELEASE_SECONDS = 6
export const HEART_RATE_RATE = 20
export const HOLD_HEART_BOOST = 8

export interface Tension {
  state: TensionState
  /** Seconds spent in RELEASE. */
  releaseTime: number
  fear: number
}

export const createTension = (state: TensionState = 'CALM', fear = FEAR_TARGET[state]): Tension => ({
  state,
  releaseTime: 0,
  fear,
})

/** The next state for an event, or the same state when the event is not legal. */
export function nextTension(state: TensionState, event: TensionEvent): TensionState {
  switch (event) {
    case 'heard':
      return state === 'STALK' ? 'CHASE' : state
    case 'chaseStart':
      return 'CHASE'
    case 'chaseEnd':
      return state === 'CHASE' ? 'RELEASE' : state
    case 'calm':
      return state === 'CHASE' ? 'RELEASE' : 'CALM'
    case 'unease':
      return state === 'CHASE' ? state : 'UNEASE'
    case 'stalk':
      return state === 'CHASE' ? state : 'STALK'
  }
}

export function applyTension(t: Tension, event: TensionEvent): Tension {
  const state = nextTension(t.state, event)
  if (state === t.state) return t
  return { ...t, state, releaseTime: 0 }
}

const toward = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step)

export function stepTension(t: Tension, dt: number): Tension {
  const d = Number.isFinite(dt) ? Math.max(0, dt) : 0
  let state = t.state
  let releaseTime = t.releaseTime
  if (state === 'RELEASE') {
    releaseTime += d
    if (releaseTime >= RELEASE_SECONDS) {
      state = 'UNEASE'
      releaseTime = 0
    }
  }
  return { state, releaseTime, fear: toward(t.fear, FEAR_TARGET[state], FEAR_RATE * d) }
}

export function stepHeartRate(hr: number, fear: number, holding: boolean, dt: number): number {
  const d = Number.isFinite(dt) ? Math.max(0, dt) : 0
  const target = 70 + 100 * fear
  let next = toward(hr, target, HEART_RATE_RATE * d)
  if (holding) next += HOLD_HEART_BOOST * d
  return Math.min(180, Math.max(50, next))
}

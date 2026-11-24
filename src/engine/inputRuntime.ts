// Shared runtime state for the DOM-facing input and pointer lock components.
// Plain mutable objects, never React state. No React or Three.js imports.
import {
  accumulateMouse,
  createInputState,
  type InputState,
  type MouseAccumulator,
} from './input'
import { createPauseCollector } from './pointerLock'
import { gameStore } from './store'

export const inputState: InputState = createInputState()

const mouseAcc: MouseAccumulator = { x: 0, y: 0 }

export const pauseCollector = createPauseCollector()

export interface LockRuntime {
  /** Pointer lock currently held. */
  locked: boolean
  /** Lock was held at some point (or marked held by the test helper). */
  wasHeld: boolean
  /** Lock was taken for real at least once. Never set by the test helper. */
  everLocked: boolean
  /** Monotonic ms of the last lock change, or null. */
  lockChangeAtMs: number | null
}

export const lockRuntime: LockRuntime = {
  locked: false,
  wasHeld: false,
  everLocked: false,
  lockChangeAtMs: null,
}

let focusActiveProvider: () => boolean = () => false

/** The Focus system registers itself here so mouse look is discarded during a Focus. */
export function setFocusActiveProvider(fn: (() => boolean) | null): void {
  focusActiveProvider = fn ?? (() => false)
}

export function isDebugUrl(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('debug')
  } catch {
    return false
  }
}

export function nowMs(): number {
  return performance.now()
}

/** Feed one mouse move event. Returns true if it was accepted. */
export function feedMouseMove(movementX: number, movementY: number): boolean {
  if (gameStore.getState().paused) return false
  return accumulateMouse(mouseAcc, movementX, movementY, {
    locked: lockRuntime.locked,
    focusActive: focusActiveProvider(),
    lockChangeAtMs: lockRuntime.lockChangeAtMs,
    nowMs: nowMs(),
  })
}

/** Returns the movement accumulated since the last call and resets it. */
export function consumeMouseMovement(): { x: number; y: number } {
  const out = { x: mouseAcc.x, y: mouseAcc.y }
  mouseAcc.x = 0
  mouseAcc.y = 0
  return out
}

export function resetMouseMovement(): void {
  mouseAcc.x = 0
  mouseAcc.y = 0
}

/** True while an act is loaded and the game is meant to be played. */
export function isPlaying(): boolean {
  return gameStore.getState().act !== null
}

/**
 * Non-debug: an act is not playable until lock has been taken at least once.
 * Debug: always playable.
 */
export function isPlayable(): boolean {
  return isDebugUrl() || lockRuntime.everLocked
}

/**
 * Test helper: set the internal "lock was held" state, so an e2e script can then
 * dispatch `pointerlockchange` and simulate a lock loss. Only acts under ?debug.
 */
export function markLockWasHeld(held = true): void {
  if (!isDebugUrl()) return
  lockRuntime.wasHeld = held
}

let lockTarget: (() => HTMLElement | null) | null = null

export function setLockTarget(fn: (() => HTMLElement | null) | null): void {
  lockTarget = fn
}

/** Request pointer lock on the canvas. Never throws. Calls onReject on failure. */
export function requestLock(onReject?: () => void): void {
  try {
    const el = lockTarget?.()
    if (!el) {
      onReject?.()
      return
    }
    const result = (el.requestPointerLock as () => unknown).call(el)
    if (result && typeof (result as Promise<void>).catch === 'function') {
      ;(result as Promise<void>).catch(() => onReject?.())
    }
  } catch {
    onReject?.()
  }
}

/**
 * Resume from pause: unpause and request lock again. If the browser rejects the
 * request, stay paused (outside ?debug, where play without lock is allowed).
 * Call from a user gesture.
 */
export function resumeGame(): void {
  gameStore.getState().setPaused(false)
  if (lockRuntime.locked) return
  requestLock(() => {
    if (!isDebugUrl()) gameStore.getState().setPaused(true)
  })
}

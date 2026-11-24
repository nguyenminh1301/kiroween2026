// Runtime for scripted look-at. Holds the mutable Focus state outside React and
// steps it from a pausable frame-loop system. No React or Three.js imports.
import { cleanupRegistry as defaultCleanup, type CleanupRegistry } from '../engine/cleanupRegistry'
import { registerSystem as defaultRegister } from '../engine/frameDriver'
import { setFocusActiveProvider } from '../engine/inputRuntime'
import { eyePosition, setBody, type PlayerBody } from '../engine/playerBody'
import type { Vec3 } from '../types'
import { clearFocus as clearFocusState, startFocus, stepFocus, type FocusState } from './focus'

/** After player movement, before the timeline (500), so a Shot can still override the view. */
export const FOCUS_PRIORITY = 200

export interface FocusBodyAccess {
  get(): PlayerBody | null
  set(body: PlayerBody): void
}

export interface FocusController {
  /** Turn toward `target` over `seconds` (default 2). With `hold`, keep facing it until cleared. Replaces any running Focus. */
  focusOn(target: Vec3 | (() => Vec3), seconds?: number, hold?: boolean): void
  clearFocus(): void
  /** True while a scripted camera move runs. Backs the debug contract `focus()`. */
  isFocusActive(): boolean
  /** Supply the live player body. Until set, focusOn does nothing. */
  setBodyAccess(access: FocusBodyAccess | null): void
}

export interface FocusControllerDeps {
  registerSystem?: typeof defaultRegister
  cleanupRegistry?: CleanupRegistry
  installProvider?: (fn: (() => boolean) | null) => void
}

export function createFocusController(deps: FocusControllerDeps = {}): FocusController {
  const register = deps.registerSystem ?? defaultRegister
  const cleanups = deps.cleanupRegistry ?? defaultCleanup
  const installProvider = deps.installProvider ?? setFocusActiveProvider

  let state: FocusState | null = null
  let access: FocusBodyAccess | null = null
  let unregister: (() => void) | null = null

  const isActive = () => state !== null && state.active

  function stop(): void {
    state = null
    if (unregister) {
      const fn = unregister
      unregister = null
      fn()
    }
    installProvider(null)
  }

  function tick(dt: number): void {
    const body = access?.get() ?? null
    if (!state || !body) return
    const step = stepFocus(state, dt, eyePosition(body))
    access?.set(setBody(body, { yaw: step.yaw, pitch: step.pitch }))
    state = step.state
    if (!step.active) stop()
  }

  return {
    focusOn(target, seconds = 2, hold = false) {
      const body = access?.get() ?? null
      if (!body) return
      const targetFn = typeof target === 'function' ? target : () => target
      // Start from the current, possibly mid-turn, view.
      state = startFocus({ yaw: body.yaw, pitch: body.pitch }, targetFn, seconds, hold)
      installProvider(isActive)
      if (!unregister) {
        unregister = register('focus', FOCUS_PRIORITY, tick, { pausable: true })
        // The act unloading ends the Focus and removes the system.
        cleanups.register(stop)
      }
    },
    clearFocus() {
      if (state) state = clearFocusState(state)
      stop()
    },
    isFocusActive: isActive,
    setBodyAccess(next) {
      access = next
    },
  }
}

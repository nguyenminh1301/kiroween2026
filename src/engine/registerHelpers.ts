// Helpers an act uses to add systems, timers and listeners. Each one pushes its
// own cleanup into the active registry, so unloading the act removes it.
import { cleanupRegistry as defaultRegistry, type CleanupFn, type CleanupRegistry } from './cleanupRegistry'
import { registerSystem as defaultRegisterSystem, type RegisterOptions, type SystemFn } from './frameDriver'

export interface HelperDeps {
  cleanupRegistry?: CleanupRegistry
  registerSystem?: typeof defaultRegisterSystem
}

/** Wraps `fn` so it runs at most once, whether called by the caller or by the registry. */
function once(fn: CleanupFn): CleanupFn {
  let done = false
  return () => {
    if (done) return
    done = true
    fn()
  }
}

/** Register a frame system for the act. Returns an early remover. Unload removes it too. */
export function addSystem(
  name: string,
  priority: number,
  fn: SystemFn,
  opts?: RegisterOptions,
  deps: HelperDeps = {},
): CleanupFn {
  const register = deps.registerSystem ?? defaultRegisterSystem
  const remove = once(register(name, priority, fn, opts))
  ;(deps.cleanupRegistry ?? defaultRegistry).register(remove)
  return remove
}

/**
 * Run `fn` once after `seconds` of game time. Built on a pausable system, so
 * paused time never counts. Returns a cancel function.
 */
export function addTimeout(fn: () => void, seconds: number, deps: HelperDeps = {}): CleanupFn {
  let left = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  let cancel: CleanupFn = () => {}
  cancel = addSystem(
    'timeout',
    900,
    (dt) => {
      left -= dt
      if (left > 0) return
      cancel()
      fn()
    },
    { pausable: true },
    deps,
  )
  return cancel
}

/** Run `fn` every `seconds` of game time until cancelled. Catches up at most one call per frame. */
export function addInterval(fn: () => void, seconds: number, deps: HelperDeps = {}): CleanupFn {
  const period = Number.isFinite(seconds) && seconds > 0 ? seconds : 1
  let acc = 0
  return addSystem(
    'interval',
    900,
    (dt) => {
      acc += dt
      if (acc < period) return
      acc -= period
      fn()
    },
    { pausable: true },
    deps,
  )
}

/** Minimal event target shape, so tests can pass a fake. */
export interface ListenerTarget {
  addEventListener(type: string, listener: (ev: never) => void, options?: unknown): void
  removeEventListener(type: string, listener: (ev: never) => void, options?: unknown): void
}

/** Add an event listener for the act. Returns an early remover. Unload removes it too. */
export function addListener(
  target: ListenerTarget,
  type: string,
  listener: (ev: never) => void,
  options?: AddEventListenerOptions | boolean,
  deps: HelperDeps = {},
): CleanupFn {
  target.addEventListener(type, listener, options)
  const remove = once(() => target.removeEventListener(type, listener, options))
  ;(deps.cleanupRegistry ?? defaultRegistry).register(remove)
  return remove
}

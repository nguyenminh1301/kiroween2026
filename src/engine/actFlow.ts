// The hand-off from one act to the next. An act calls `completeAct()` when it ends.
// The app installs the handler (loader wiring), so acts never import the loader.
import { nextAct } from './actOrder'
import { gameStore } from './store'
import type { ActId } from '../types'

type Handler = (from: ActId, next: ActId | null) => void

let handler: Handler | null = null

/** Install the handler. Boot passes one that loads the next act or finishes the run. */
export function setCompleteHandler(fn: Handler | null): void {
  handler = fn
}

/** End the current act. The next act loads from its first checkpoint, after act 5 the Archive shows. */
export function completeAct(): void {
  const from = gameStore.getState().act
  if (!from || !handler) return
  const h = handler
  // Defer so the calling act finishes its own callback before it is unloaded.
  queueMicrotask(() => h(from, nextAct(from)))
}


let restartHandler: (() => void) | null = null

/** Install the handler that reloads the current act at its current checkpoint. */
export function setRestartHandler(fn: (() => void) | null): void {
  restartHandler = fn
}

/** Reload the current act at its checkpoint, with no chapter card. */
export function restartAct(): void {
  const h = restartHandler
  if (h) queueMicrotask(h)
}

let preloadHandler: ((next: ActId) => void) | null = null

/** Install the handler that fetches an act chunk ahead of time. */
export function setPreloadHandler(fn: ((next: ActId) => void) | null): void {
  preloadHandler = fn
}

/** Start fetching the next act while the current one is still playing, so the switch does not wait. */
export function preloadNextAct(): void {
  const from = gameStore.getState().act
  if (!from || !preloadHandler) return
  const next = nextAct(from)
  if (next) preloadHandler(next)
}

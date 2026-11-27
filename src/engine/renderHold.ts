// Moments when frame times say nothing about the picture: loads, act changes,
// camera cuts, a resume. The adaptive scaler ignores frames for a while after each.

/** Time frames are ignored after a hold, in milliseconds of unpaused game time. */
export const HOLD_MS = 3000

/** Time frames are ignored after a camera cut. The samples before it are kept. */
export const CUT_HOLD_MS = 1000

const listeners = new Set<(ms: number, clear: boolean) => void>()

/** A load, an act change or a resume: ignore frame times for `ms` (default 3 s) and forget the old ones. */
export function holdRender(ms: number = HOLD_MS): void {
  for (const l of [...listeners]) l(ms, true)
}

/** A camera cut: ignore the next frames for `ms` (default 1 s). Slow frames from before the cut still count. */
export function holdCut(ms: number = CUT_HOLD_MS): void {
  for (const l of [...listeners]) l(ms, false)
}

export function onRenderHold(listener: (ms: number, clear: boolean) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

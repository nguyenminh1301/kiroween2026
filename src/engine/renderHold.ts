// Moments when frame times say nothing about the picture: loads, act changes,
// camera cuts, a resume. The adaptive scaler ignores frames for a while after each.

/** Time frames are ignored after a hold, in milliseconds of unpaused game time. */
export const HOLD_MS = 3000

const listeners = new Set<(ms: number) => void>()

/** Ask the scaler to ignore frame times for `ms` (default 3 s). */
export function holdRender(ms: number = HOLD_MS): void {
  for (const l of [...listeners]) l(ms)
}

export function onRenderHold(listener: (ms: number) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

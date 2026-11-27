import { levelCount } from './levelTable'

export const SETTLE_MS = 3000
export const DOWN_WINDOW_MS = 3000
export const UP_WINDOW_MS = 5000
export const DOWN_THRESHOLD_MS = 25
/** Highest climb threshold: a 60 Hz display gives 16.7 ms frames. */
export const UP_THRESHOLD_MAX_MS = 17.5
export const UP_THRESHOLD_MIN_MS = 7
/** After a drop the scaler does not climb for this long. */
export const UP_BLOCK_MS = 30000

export interface DecisionOptions {
  /** Highest allowed level (lowest index). */
  top?: number
  /** Lowest allowed level (highest index). */
  floor?: number
  /** A climb is not allowed now. */
  upBlocked?: boolean
}

/** Mean of the newest samples whose sum reaches spanMs, or null if they never do. */
export function windowMean(samplesMs: readonly number[], spanMs: number): number | null {
  let sum = 0
  let count = 0
  for (let i = samplesMs.length - 1; i >= 0; i--) {
    sum += samplesMs[i]
    count++
    if (sum >= spanMs) return sum / count
  }
  return null
}

/** The display's frame time: the 10th percentile of the samples, the fast frames. */
export function displayFrameMs(samplesMs: readonly number[]): number {
  if (samplesMs.length === 0) return UP_THRESHOLD_MAX_MS
  const sorted = [...samplesMs].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * 0.1)]
}

/** Mean frame time under which the picture may go up one level. */
export function climbThreshold(samplesMs: readonly number[]): number {
  const t = displayFrameMs(samplesMs) * 1.1
  return Math.min(UP_THRESHOLD_MAX_MS, Math.max(UP_THRESHOLD_MIN_MS, t))
}

export function nextLevel(
  level: number,
  samplesMs: readonly number[],
  msSinceChange: number,
  opts: DecisionOptions = {},
): number {
  const top = Math.max(0, opts.top ?? 0)
  const floor = Math.min(levelCount() - 1, opts.floor ?? levelCount() - 1)
  const lvl = Math.min(floor, Math.max(top, Math.trunc(Number.isFinite(level) ? level : top)))
  if (!(msSinceChange >= SETTLE_MS)) return lvl
  const samples = samplesMs.filter((s) => Number.isFinite(s) && s >= 0)
  if (samples.length === 0) return lvl
  const down = windowMean(samples, DOWN_WINDOW_MS)
  if (down !== null && down > DOWN_THRESHOLD_MS) return Math.min(floor, lvl + 1)
  if (opts.upBlocked) return lvl
  const up = windowMean(samples, UP_WINDOW_MS)
  if (up !== null && up < climbThreshold(samples.slice(-300))) return Math.max(top, lvl - 1)
  return lvl
}

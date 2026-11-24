import { levelCount } from './levelTable'

export const SETTLE_MS = 3000
export const DOWN_WINDOW_MS = 2000
export const UP_WINDOW_MS = 5000
export const DOWN_THRESHOLD_MS = 20
export const UP_THRESHOLD_MS = 12

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

export function nextLevel(level: number, samplesMs: readonly number[], msSinceChange: number): number {
  const last = levelCount() - 1
  const lvl = Math.min(last, Math.max(0, Math.trunc(Number.isFinite(level) ? level : 0)))
  if (!(msSinceChange >= SETTLE_MS)) return lvl
  const samples = samplesMs.filter((s) => Number.isFinite(s) && s >= 0)
  if (samples.length === 0) return lvl
  const down = windowMean(samples, DOWN_WINDOW_MS)
  if (down !== null && down > DOWN_THRESHOLD_MS) return Math.min(last, lvl + 1)
  const up = windowMean(samples, UP_WINDOW_MS)
  if (up !== null && up < UP_THRESHOLD_MS) return Math.max(0, lvl - 1)
  return lvl
}

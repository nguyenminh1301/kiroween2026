export interface LookParams {
  vignette: number
  fringe: number
  noise: number
}

export function clampFear(fear: number): number {
  if (!Number.isFinite(fear)) return 0
  return Math.min(1, Math.max(0, fear))
}

export function lookParams(fear: number, reducedMotion: boolean): LookParams {
  const f = clampFear(fear)
  const vignette = 0.25 + 0.75 * f
  let fringe = f
  let noise = 0.2 + 0.8 * f
  if (reducedMotion) {
    fringe *= 0.5
    noise *= 0.5
  }
  return { vignette, fringe, noise }
}

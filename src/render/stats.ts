export interface RenderStats {
  frameMs: number
  calls: number
  triangles: number
  internalWidth: number
  internalHeight: number
  level: number
}

export function smoothEma(previous: number | null, sample: number, alpha = 0.1): number {
  if (previous === null || !Number.isFinite(previous)) return sample
  return previous + (sample - previous) * alpha
}

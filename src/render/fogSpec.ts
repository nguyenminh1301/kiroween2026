export interface FogSpec {
  color: number
  near: number
  far: number
}

export function isValidFogSpec(spec: { near: number; far: number }): boolean {
  const { near, far } = spec
  return Number.isFinite(near) && Number.isFinite(far) && near >= 0 && near < far
}

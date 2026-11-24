export const LEVEL_TABLE: readonly (readonly [number, number])[] = [
  [960, 540],
  [640, 360],
  [480, 270],
  [320, 180],
]

export const DEFAULT_LEVEL = 1

export function levelCount(): number {
  return LEVEL_TABLE.length
}

export function lookupLevel(level: number): { width: number; height: number } {
  const n = Number.isFinite(level) ? Math.trunc(level) : DEFAULT_LEVEL
  const clamped = Math.min(LEVEL_TABLE.length - 1, Math.max(0, n))
  const [width, height] = LEVEL_TABLE[clamped]
  return { width, height }
}

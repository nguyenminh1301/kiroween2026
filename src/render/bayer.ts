export const BAYER4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

function mod4(n: number): number {
  return ((Math.floor(n) % 4) + 4) % 4
}

/** Ordered dither threshold in [0, 1), period 4 in both axes. */
export function bayer4(x: number, y: number): number {
  return (BAYER4[mod4(y)][mod4(x)] + 0.5) / 16
}

/** 6-bit quantize with ordered dither, mirrors the shader. */
export function quantize(channel: number, dither: number): number {
  const g = Math.min(1, Math.max(0, channel))
  const q = Math.floor(g * 63 + dither) / 63
  return Math.min(1, Math.max(0, q))
}

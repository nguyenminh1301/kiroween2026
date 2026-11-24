import { createRng } from '../rng'

export const TILE = 128

export interface PixelData {
  width: number
  height: number
  data: Uint8ClampedArray
}

export type Rgb = readonly [number, number, number]

export function hex(h: number): Rgb {
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255]
}

export function lerp(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

export function scale(c: Rgb, f: number): Rgb {
  return [c[0] * f, c[1] * f, c[2] * f]
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]
}

export function createTile(): PixelData {
  return { width: TILE, height: TILE, data: new Uint8ClampedArray(TILE * TILE * 4) }
}

export function setPx(p: PixelData, x: number, y: number, c: Rgb): void {
  const i = (y * p.width + x) * 4
  p.data[i] = Math.round(c[0])
  p.data[i + 1] = Math.round(c[1])
  p.data[i + 2] = Math.round(c[2])
  p.data[i + 3] = 255
}

/** Value noise on a wrapping lattice, so a 128 px tile seams cleanly. Returns [0, 1). */
export function makeNoise(rng: () => number, cells: number): (x: number, y: number) => number {
  const lattice: number[] = []
  for (let i = 0; i < cells * cells; i++) lattice.push(rng())
  const at = (cx: number, cy: number) => lattice[(((cy % cells) + cells) % cells) * cells + (((cx % cells) + cells) % cells)]
  return (x, y) => {
    const fx = (x / TILE) * cells
    const fy = (y / TILE) * cells
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const sx = tx * tx * (3 - 2 * tx)
    const sy = ty * ty * (3 - 2 * ty)
    const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx
    const bot = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx
    return top * (1 - sy) + bot * sy
  }
}

/** Two octaves of wrap-around noise in [0, 1). */
export function makeFbm(rng: () => number): (x: number, y: number) => number {
  const a = makeNoise(rng, 4)
  const b = makeNoise(rng, 16)
  return (x, y) => a(x, y) * 0.65 + b(x, y) * 0.35
}

export function fill(p: PixelData, fn: (x: number, y: number) => Rgb): PixelData {
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) setPx(p, x, y, fn(x, y))
  return p
}

export { createRng }

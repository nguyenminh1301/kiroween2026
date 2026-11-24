import { createRng } from '../rng'
import { createTile, fill, hex, lerp, scale, type PixelData } from './helpers'

const PAINT = hex(0xcfc8b6)
const SHADE = hex(0xa59d88)
const SEAM = hex(0x2c2820)
const RIVET = hex(0x4a4436)
const STENCIL = hex(0x1c1a14)

/** Cabin wall: one 128 px painted panel with dark seams on every edge, rivet rows and stencil marks. */
export function drawCabinPanel(seed: number): PixelData {
  const rng = createRng(seed)
  const marks = new Set<number>()
  for (let i = 0; i < 6; i++) {
    const sx = 10 + Math.floor(rng() * 90)
    const sy = 10 + Math.floor(rng() * 100)
    const w = 6 + Math.floor(rng() * 12)
    for (let k = 0; k < w; k++) {
      marks.add(sy * 128 + sx + k)
      if (rng() < 0.6) marks.add((sy + 1) * 128 + sx + k)
      if (rng() < 0.3) marks.add((sy + 2) * 128 + sx + k)
    }
  }
  const p = createTile()
  return fill(p, (x, y) => {
    const g = 1 + (rng() - 0.5) * 0.05
    if ((x + 1) % 128 < 3 || (y + 1) % 64 < 2) return scale(SEAM, g)
    const lx = x % 128
    const ly = y % 64
    if (ly % 56 === 6 && lx % 16 === 8) return RIVET
    if ((ly === 7 || ly === 5) && lx % 16 === 8) return scale(SHADE, g)
    if (marks.has(y * 128 + x)) return scale(STENCIL, g)
    return scale(lerp(PAINT, SHADE, lx < 5 || ly < 5 ? 0.35 : (x * 7 + y * 3) % 29 === 0 ? 0.2 : 0), g)
  })
}

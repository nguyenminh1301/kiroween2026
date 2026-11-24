import { createRng } from '../rng'
import { createTile, fill, hex, lerp, scale, type PixelData } from './helpers'

const RED = hex(0x8e3b22)
const DARK = hex(0x4a1d10)
const RIVET = hex(0xc9a48c)
const SCUFF = hex(0xc6683f)

/** Red gantry steel: two plates with dark seams, rivets in rows, and a few light scuffs. */
export function drawPaintedSteel(seed: number): PixelData {
  const rng = createRng(seed)
  const scuffs = new Set<number>()
  for (let i = 0; i < 6; i++) {
    const sx = Math.floor(rng() * 110)
    const sy = Math.floor(rng() * 126)
    for (let k = 0; k < 14; k++) scuffs.add((sy + (k % 2)) * 128 + sx + k)
  }
  const p = createTile()
  return fill(p, (x, y) => {
    const g = 1 + (rng() - 0.5) * 0.05
    const seamX = (x + 1) % 64 < 2
    const seamY = (y + 1) % 64 < 2
    if (seamX || seamY) return scale(DARK, g)
    const rivet = (x % 64 === 8 || x % 64 === 56) && y % 16 === 8
    const rivet2 = (y % 64 === 8 || y % 64 === 56) && x % 16 === 8
    if (rivet || rivet2) return RIVET
    let c = scale(RED, (x % 64) < 5 || (y % 64) < 5 ? 1.12 : 1)
    if (scuffs.has(y * 128 + x)) c = lerp(c, SCUFF, 0.9)
    return scale(c, g)
  })
}

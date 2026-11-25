import { createRng } from '../rng'
import { createTile, fill, hex, lerp, scale, type PixelData } from './helpers'

const WHITE = hex(0xf2ebdd)
const GREY = hex(0xb9b2a2)
const SEAM = hex(0x6f695c)
const SCUFF = hex(0x9c9484)
const BEIGE = hex(0xd8c8a6)
const STENCIL = hex(0x4a4538)

/** Small stencil marks: short bars in a row, like painted part numbers. */
const isStencil = (x: number, y: number): boolean => {
  const lx = x % 64
  const ly = y % 64
  if (ly < 24 || ly > 29 || lx < 12 || lx > 50) return false
  return (lx - 12) % 6 < 4 && (((lx - 12) / 6) | 0) % 3 !== 2
}

/** White Room wall: 64 px panels with seams, rivets at the corners and grey scuffs. */
export function drawWhiteRoom(seed: number): PixelData {
  const rng = createRng(seed)
  const scuffs = new Set<number>()
  for (let i = 0; i < 8; i++) {
    const sx = Math.floor(rng() * 112)
    const sy = Math.floor(rng() * 124)
    for (let k = 0; k < 10 + Math.floor(rng() * 6); k++) scuffs.add((sy + Math.floor(k / 5)) * 128 + sx + k)
  }
  const p = createTile()
  return fill(p, (x, y) => {
    const g = 1 + (rng() - 0.5) * 0.04
    if ((x + 1) % 64 < 2 || (y + 1) % 64 < 2) return scale(SEAM, g)
    const lx = x % 64
    const ly = y % 64
    if ((lx === 6 || lx === 58) && (ly === 6 || ly === 58)) return GREY
    if (scuffs.has(y * 128 + x)) return scale(SCUFF, g)
    if (isStencil(x, y) && (Math.floor(x / 64) + Math.floor(y / 64)) % 2 === 0) return scale(STENCIL, g)
    if (y >= 64) return scale(lerp(BEIGE, GREY, lx < 4 || ly < 4 ? 0.25 : 0), g)
    return scale(lerp(WHITE, GREY, lx < 4 || ly < 4 ? 0.25 : 0), g)
  })
}

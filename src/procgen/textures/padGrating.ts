import { createRng } from '../rng'
import { createTile, fill, hex, lerp, scale, type PixelData, type Rgb } from './helpers'

const BAR = hex(0x6b655a)
const BAR_LIGHT = hex(0x9a9384)
const GAP = hex(0x12100d)
const RIB = hex(0x3d3930)

/** Pad walkway grating: 32 px period, 22 px bars, a cross rib, crisp edges and a few scuffs. */
export function drawPadGrating(seed: number): PixelData {
  const rng = createRng(seed)
  const scuffs = new Set<number>()
  for (let i = 0; i < 40; i++) scuffs.add(Math.floor(rng() * 128) * 128 + Math.floor(rng() * 128))
  const p = createTile()
  return fill(p, (x, y) => {
    const u = x % 32
    const g = 1 + (rng() - 0.5) * 0.05
    const bar = u >= 5 && u < 27
    const rib = y % 64 >= 30 && y % 64 < 36
    if (!bar) return scale(rib ? RIB : GAP, g)
    let c: Rgb = BAR
    if (u === 5 || u === 6) c = BAR_LIGHT
    if (u === 26) c = scale(BAR, 0.7)
    if (rib) c = RIB
    if (scuffs.has(y * 128 + x)) c = lerp(c, BAR_LIGHT, 0.8)
    return scale(c, g)
  })
}

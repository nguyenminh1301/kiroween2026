import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, scale, type PixelData } from './helpers'

const SHADOW = hex(0x3a342a)
const DARK = hex(0x2a0f0b)
const RUST = hex(0x6b2a1c)

/** Floor grating: bars every 16 px with a dark gap, light wear. */
export function drawGratingPlate(seed: number): PixelData {
  const rng = createRng(seed)
  const fbm = makeFbm(rng)
  const p = createTile()
  return fill(p, (x, y) => {
    const bar = x % 16 >= 3 && x % 16 < 13
    const cross = (y + 1) % 32 < 3
    let c = bar ? lerp(SHADOW, RUST, fbm(x, y) * 0.6) : DARK
    if (cross) c = scale(lerp(SHADOW, RUST, 0.3), 1.1 + fbm(y, x) * 0.2)
    return scale(c, 0.85 + fbm(x + 17, y + 31) * 0.3)
  })
}

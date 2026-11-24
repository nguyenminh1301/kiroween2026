import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, scale, type PixelData } from './helpers'

const WHITE = hex(0xe9e7df)
const ORANGE = hex(0xe2782f)
const YELLOW = hex(0xe9b740)
const SHADOW = hex(0x3a342a)

/** Clean white panel with an orange stripe. */
export function drawWhitePanel(seed: number): PixelData {
  const rng = createRng(seed)
  const fbm = makeFbm(rng)
  const shift = Math.floor(rng() * 8)
  const p = createTile()
  return fill(p, (x, y) => {
    let c = scale(WHITE, 0.92 + fbm(x, y) * 0.1)
    if (y >= 52 + shift && y < 68 + shift) c = lerp(c, ORANGE, 0.92)
    else if (y >= 68 + shift && y < 72 + shift) c = lerp(c, YELLOW, 0.9)
    if (x === 0 || y === 0 || x === 127 || y === 127) c = lerp(c, SHADOW, 0.25)
    return c
  })
}

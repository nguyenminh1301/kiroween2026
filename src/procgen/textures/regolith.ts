import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, makeNoise, type PixelData } from './helpers'

const DUST = hex(0xd8d4c6)
const SHADOW = hex(0x3a342a)

/** Lunar regolith noise. */
export function drawRegolith(seed: number): PixelData {
  const rng = createRng(seed)
  const fbm = makeFbm(rng)
  const fine = makeNoise(rng, 64)
  const p = createTile()
  const speck = createRng(seed ^ 0x27d4eb2d)
  return fill(p, (x, y) => {
    let c = lerp(DUST, SHADOW, fbm(x, y) * 0.35 + fine(x, y) * 0.2)
    if (speck() < 0.015) c = lerp(c, SHADOW, 0.5)
    return c
  })
}

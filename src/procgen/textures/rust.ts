import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, makeNoise, type PixelData } from './helpers'

const DARK = hex(0x2a0f0b)
const RUST = hex(0x6b2a1c)
const OXIDE = hex(0xb44a2e)

/** Rust with blotches and grime. */
export function drawRust(seed: number): PixelData {
  const rng = createRng(seed)
  const blotch = makeFbm(rng)
  const fine = makeNoise(rng, 32)
  const p = createTile()
  const speck = createRng(seed ^ 0x5bd1e995)
  return fill(p, (x, y) => {
    const b = blotch(x, y)
    let c = lerp(RUST, OXIDE, Math.max(0, (b - 0.45) * 3))
    c = lerp(c, DARK, Math.max(0, (0.4 - b) * 2.5) + fine(x, y) * 0.25)
    if (speck() < 0.03) c = lerp(c, DARK, 0.7)
    return c
  })
}

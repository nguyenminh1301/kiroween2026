import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, makeNoise, type PixelData } from './helpers'

const DARK = hex(0x2a0f0b)
const RUST = hex(0x6b2a1c)
const OXIDE = hex(0xb44a2e)

/** Rust plates: bolted panel seams, blotches and long grime streaks, with strong contrast for a flashlight. */
export function drawRust(seed: number): PixelData {
  const rng = createRng(seed)
  const blotch = makeFbm(rng)
  const fine = makeNoise(rng, 32)
  const streak = makeNoise(rng, 16)
  const p = createTile()
  const speck = createRng(seed ^ 0x5bd1e995)
  const BOLT = hex(0xd7683f)
  const SEAM = hex(0x160604)
  return fill(p, (x, y) => {
    const b = blotch(x, y)
    let c = lerp(RUST, OXIDE, Math.max(0, (b - 0.42) * 3.4))
    c = lerp(c, DARK, Math.max(0, (0.42 - b) * 3) + fine(x, y) * 0.3)
    // Vertical streaks: thin columns that run down the plate.
    const s = streak(x * 3, Math.floor(y / 48) * 3)
    if (s > 0.62) c = lerp(c, DARK, Math.min(0.7, (s - 0.62) * 5))
    if (speck() < 0.03) c = lerp(c, DARK, 0.7)
    // Plates are 64 px square: a dark seam, a lit edge beside it.
    const mx = x % 64
    const my = y % 64
    if (mx < 2 || my < 2) return SEAM
    if (mx === 2 || my === 2) return lerp(c, OXIDE, 0.6)
    // Bolts near each plate corner.
    for (const [bx, by] of [[8, 8], [55, 8], [8, 55], [55, 55]]) {
      const d = Math.hypot(mx - bx, my - by)
      if (d < 2.2) return BOLT
      if (d < 3.4) return SEAM
    }
    return c
  })
}

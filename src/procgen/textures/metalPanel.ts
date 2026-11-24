import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, scale, type PixelData } from './helpers'

const BEIGE = hex(0xcfc8b6)
const SHADOW = hex(0x3a342a)
const TUNGSTEN = hex(0xe9c27a)

/** Painted metal panel with seams and rivets. */
export function drawMetalPanel(seed: number): PixelData {
  const rng = createRng(seed)
  const fbm = makeFbm(rng)
  const jitter = Math.floor(rng() * 3)
  const p = createTile()
  return fill(p, (x, y) => {
    let c = lerp(BEIGE, TUNGSTEN, fbm(x, y) * 0.35)
    c = scale(c, 0.82 + fbm(y, x) * 0.25)
    // seam lines on every tile edge (both sides, so tiles join cleanly)
    if (x === 0 || y === 0 || x === 127 || y === 127) c = lerp(c, SHADOW, 0.55)
    // rivets at fixed interior grid
    for (const rx of [16, 112]) {
      for (const ry of [16, 112]) {
        const d = Math.hypot(x - (rx + jitter), y - (ry + jitter))
        if (d < 3) c = lerp(c, SHADOW, 0.65)
        else if (d < 4.5) c = scale(c, 1.15)
      }
    }
    return c
  })
}

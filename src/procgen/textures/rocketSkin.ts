import { createRng } from '../rng'
import { createTile, fill, hex, scale, type PixelData } from './helpers'

const WHITE = hex(0xf2ebdd)
const BLACK = hex(0x16140f)
const SEAM = hex(0x8b8576)

/** Saturn skin, wrapped once around a cylinder: white above, black and white roll quadrants below. */
export function drawRocketSkin(seed: number): PixelData {
  const rng = createRng(seed)
  const p = createTile()
  return fill(p, (x, y) => {
    const g = 1 + (rng() - 0.5) * 0.04
    if ((y + 1) % 64 < 2 || (x + 1) % 32 < 2) return scale(SEAM, g)
    if (y >= 64 && (x < 32 || (x >= 64 && x < 96))) return scale(BLACK, g)
    return scale(WHITE, g)
  })
}

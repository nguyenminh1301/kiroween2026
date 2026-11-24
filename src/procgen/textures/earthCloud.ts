import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, scale, type PixelData } from './helpers'

const OCEAN = hex(0x2f5f8f)
const DEEP = hex(0x1d426b)
const LAND = hex(0x5d7a4e)
const CLOUD = hex(0xf4f6f8)

/** Earth seen from space: blue ocean, a little land and white cloud. Used on a disc at low resolution. */
export function drawEarthCloud(seed: number): PixelData {
  const rng = createRng(seed)
  const land = makeFbm(createRng(seed + 11))
  const cloud = makeFbm(createRng(seed + 23))
  const p = createTile()
  return fill(p, (x, y) => {
    const g = 1 + (rng() - 0.5) * 0.03
    const l = land(x, y)
    let c = lerp(DEEP, OCEAN, Math.min(1, l * 1.6))
    if (l > 0.62) c = LAND
    const k = cloud(x + 40, y + 17)
    if (k > 0.56) c = lerp(c, CLOUD, Math.min(1, (k - 0.56) * 9))
    return scale(c, g)
  })
}

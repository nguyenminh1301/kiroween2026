import { createRng } from '../rng'
import { createTile, fill, hex, lerp, makeFbm, scale, type PixelData } from './helpers'

const BEIGE = hex(0xcfc8b6)
const SHADOW = hex(0x3a342a)
const RED = hex(0x8e3b22)
const TUNGSTEN = hex(0xe9c27a)

/** Beige instrument panel with small dials. */
export function drawInstrumentPanel(seed: number): PixelData {
  const rng = createRng(seed)
  const fbm = makeFbm(rng)
  const needle = [0, 1, 2, 3].map(() => rng() * Math.PI * 2)
  const p = createTile()
  return fill(p, (x, y) => {
    let c = scale(BEIGE, 0.88 + fbm(x, y) * 0.18)
    if (x === 0 || y === 0 || x === 127 || y === 127) c = lerp(c, SHADOW, 0.4)
    let n = 0
    for (const cy of [32, 96]) {
      for (const cx of [32, 96]) {
        const dx = x - cx
        const dy = y - cy
        const d = Math.hypot(dx, dy)
        if (d < 17) {
          if (d > 14) c = lerp(c, SHADOW, 0.85)
          else {
            c = lerp(c, TUNGSTEN, 0.45)
            const a = needle[n]
            const along = dx * Math.cos(a) + dy * Math.sin(a)
            const across = -dx * Math.sin(a) + dy * Math.cos(a)
            if (along > 0 && along < 12 && Math.abs(across) < 1) c = RED
            if (d < 2) c = SHADOW
          }
        }
        n++
      }
    }
    return c
  })
}

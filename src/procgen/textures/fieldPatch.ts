import { createRng } from '../rng'
import { createTile, fill, hex, scale, type PixelData } from './helpers'

const COLORS = [hex(0x6a6b3f), hex(0x5a6338), hex(0x7a6c44), hex(0x8a7c52), hex(0x4f5a34), hex(0x6f5d3d)]

/** Ground field: 16 px patches of green and brown, each one flat. The grid is offset so the tile wraps. */
export function drawFieldPatch(seed: number): PixelData {
  const rng = createRng(seed)
  const cells: number[] = []
  for (let i = 0; i < 64; i++) cells.push(Math.floor(rng() * COLORS.length))
  const p = createTile()
  return fill(p, (x, y) => {
    const cell = cells[Math.floor(((y + 8) % 128) / 16) * 8 + Math.floor(((x + 8) % 128) / 16)]
    return scale(COLORS[cell], 1 + (rng() - 0.5) * 0.04)
  })
}

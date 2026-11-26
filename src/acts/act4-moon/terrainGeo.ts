// Terrain mesh builder. No React imports.
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { CELL, CELLS, FAR_EDGE, HALF, SIZE, curveDrop, heightGrid, terrainHeight } from './terrain'

/** Terrain from the same grid `groundAt` reads. Vertices are shared, so normals are smooth and there is no seam. */
export function buildTerrainGeometry(): BufferGeometry {
  const g = heightGrid()
  const n = CELLS + 1
  const pos: number[] = []
  const uv: number[] = []
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -SIZE / 2 + i * CELL
      const z = -SIZE / 2 + j * CELL
      pos.push(x, g[j * n + i], z)
      uv.push(x / 6, z / 6)
    }
  }
  const idx: number[] = []
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      // Counter-clockwise seen from above (+y).
      idx.push(a, c, b, b, c, d)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** Square rings of the far field: from the edge of the detailed grid to 2.5 km. Each ring has the same number of cells per side. */
export const FAR_RINGS: ReadonlyArray<{ inner: number; outer: number; steps: number; uv: number }> = [
  { inner: HALF, outer: 320, steps: 8, uv: 24 },
  { inner: 320, outer: 900, steps: 8, uv: 96 },
  { inner: 900, outer: FAR_EDGE, steps: 9, uv: 384 },
]

/** The perimeter point `p` (0 to 4 x CELLS) of the square of half-size `s`. */
function perimeter(p: number, s: number): [number, number] {
  const side = Math.floor(p / CELLS) % 4
  const t = (p % CELLS) / CELLS
  const a = -s + 2 * s * t
  if (side === 0) return [a, -s]
  if (side === 1) return [s, a]
  if (side === 2) return [s - 2 * s * t, s]
  return [-s, s - 2 * s * t]
}

/**
 * Low detail ground out to the horizon. The first loop uses the same points as the edge of the detailed grid,
 * so the two meet without a crack, and every height drops by the Moon's curve (about 1.8 m at the edge).
 */
export function buildFarGeometry(): BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const per = CELLS * 4
  let base = 0
  for (const ring of FAR_RINGS) {
    for (let j = 0; j <= ring.steps; j++) {
      // Loops get farther apart toward the outside, so the near ones stay fine.
      const f = j / ring.steps
      const s = ring.inner + (ring.outer - ring.inner) * (0.35 * f + 0.65 * f * f)
      for (let k = 0; k < per; k++) {
        const [x, z] = perimeter(k, s)
        pos.push(x, terrainHeight(x, z) - curveDrop(x, z), z)
        uv.push(x / ring.uv, z / ring.uv)
      }
    }
    for (let j = 0; j < ring.steps; j++) {
      for (let k = 0; k < per; k++) {
        const a = base + j * per + k
        const b = base + j * per + ((k + 1) % per)
        const c = a + per
        const d = b + per
        idx.push(a, b, c, b, d, c)
      }
    }
    base += (ring.steps + 1) * per
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

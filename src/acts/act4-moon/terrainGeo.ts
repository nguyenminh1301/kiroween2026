// Terrain mesh builder. No React imports.
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { CELL, CELLS, SIZE, heightGrid } from './terrain'

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

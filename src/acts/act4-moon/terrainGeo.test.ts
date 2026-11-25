import { describe, expect, it } from 'vitest'
import { buildTerrainGeometry } from './terrainGeo'
import { CELLS } from './terrain'

describe('terrain geometry', () => {
  it('shares vertices so normals blend across every edge', () => {
    const g = buildTerrainGeometry()
    expect(g.attributes.position.count).toBe((CELLS + 1) ** 2)
    expect(g.attributes.normal.count).toBe((CELLS + 1) ** 2)
  })

  it('has no lighting seam: neighbouring normals differ by under 30 degrees', () => {
    const g = buildTerrainGeometry()
    const n = g.attributes.normal
    const w = CELLS + 1
    let worst = 0
    for (let j = 0; j < w; j++) {
      for (let i = 0; i < w - 1; i++) {
        const a = j * w + i
        const b = a + 1
        const dot = n.getX(a) * n.getX(b) + n.getY(a) * n.getY(b) + n.getZ(a) * n.getZ(b)
        worst = Math.max(worst, Math.acos(Math.min(1, dot)))
      }
    }
    expect(worst).toBeLessThan(Math.PI / 6)
    for (let k = 0; k < n.count; k++) expect(n.getY(k)).toBeGreaterThan(0.5)
  })
})

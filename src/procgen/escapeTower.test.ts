import { describe, expect, it } from 'vitest'
import { buildEscapeTower, TOWER_HEIGHT } from './escapeTower'

describe('escape tower', () => {
  it('is about 10 m tall and thin, with the truss open', () => {
    const { white, dark } = buildEscapeTower(0, 5, 0)
    white.computeBoundingBox()
    dark.computeBoundingBox()
    expect(TOWER_HEIGHT).toBeCloseTo(10, 0)
    const top = Math.max(white.boundingBox!.max.y, dark.boundingBox!.max.y)
    expect(top - 5).toBeCloseTo(TOWER_HEIGHT, 1)
    expect(white.boundingBox!.max.x - white.boundingBox!.min.x).toBeCloseTo(0.7, 2)
    expect(dark.boundingBox!.min.y).toBeGreaterThanOrEqual(4.95)
    // Truss base is 1.2 m wide; the canards stick out a little further.
    expect(dark.boundingBox!.max.x - dark.boundingBox!.min.x).toBeLessThan(1.6)
    expect(dark.boundingBox!.max.x - dark.boundingBox!.min.x).toBeGreaterThan(1.15)
  })
})

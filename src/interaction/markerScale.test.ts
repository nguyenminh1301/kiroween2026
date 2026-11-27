import { describe, expect, it } from 'vitest'
import { markerScale } from './markerScale'

describe('markerScale', () => {
  it('keeps the real size up close and keeps the apparent size past 4 m', () => {
    expect(markerScale(0)).toBe(1)
    expect(markerScale(4)).toBe(1)
    for (const d of [8, 20, 40]) expect(markerScale(d) / d).toBeCloseTo(1 / 4)
  })
  it('ignores bad distances', () => {
    expect(markerScale(NaN)).toBe(1)
  })
})

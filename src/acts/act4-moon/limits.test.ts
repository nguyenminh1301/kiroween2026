import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { limitPosition } from './limits'

describe('walking limit', () => {
  it('leaves points inside 70 m alone', () => {
    expect(limitPosition(30, -40, 0.016)).toEqual({ x: 30, z: -40, warn: false })
  })

  it('pulls back softly past 70 m and warns past 74 m', () => {
    const r = limitPosition(76, 0, 0.1)
    expect(r.x).toBeLessThan(76)
    expect(r.x).toBeGreaterThan(75)
    expect(r.warn).toBe(true)
    expect(limitPosition(72, 0, 0.016).warn).toBe(false)
  })

  it('never lets a point stay beyond 80 m, and keeps its bearing', () => {
    fc.assert(
      fc.property(fc.double({ min: -300, max: 300, noNaN: true }), fc.double({ min: -300, max: 300, noNaN: true }), (x, z) => {
        const r = limitPosition(x, z, 0.016)
        expect(Math.hypot(r.x, r.z)).toBeLessThanOrEqual(80 + 1e-9)
        if (Math.hypot(x, z) > 1) expect(r.x * z - r.z * x).toBeCloseTo(0, 6)
      }),
    )
  })

  it('holds a walker who keeps pushing out below 80 m', () => {
    let x = 69
    for (let i = 0; i < 2000; i++) x = limitPosition(x + 2.5 * 0.016, 0, 0.016).x
    expect(x).toBeGreaterThan(70)
    expect(x).toBeLessThan(80)
  })
})

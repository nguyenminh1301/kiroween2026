import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { clampFear, lookParams } from './fear'

describe('lookParams', () => {
  it('has a floor of grain and vignette at fear 0', () => {
    expect(lookParams(0, false)).toEqual({ vignette: 0.25, fringe: 0, noise: 0.2 })
  })
  it('treats non-finite fear as 0', () => {
    expect(clampFear(NaN)).toBe(0)
    expect(lookParams(Infinity, false)).toEqual(lookParams(0, false))
  })

  // Feature: render, Property 15: Look params formula and clamping
  it('matches the formulas and clamps', () => {
    fc.assert(
      fc.property(fc.double({ min: -5, max: 5, noNaN: true }), (f) => {
        const c = Math.min(1, Math.max(0, f))
        const p = lookParams(f, false)
        expect(p.vignette).toBeCloseTo(0.25 + 0.75 * c, 12)
        expect(p.fringe).toBeCloseTo(c, 12)
        expect(p.noise).toBeCloseTo(0.2 + 0.8 * c, 12)
      }),
      { numRuns: 100 },
    )
  })

  // Feature: render, Property 16: Reduced motion halves fringe and noise only
  it('reduced motion halves fringe and noise only', () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 3, noNaN: true }), (f) => {
        const a = lookParams(f, false)
        const b = lookParams(f, true)
        expect(b.vignette).toBe(a.vignette)
        expect(b.fringe).toBeCloseTo(a.fringe / 2, 12)
        expect(b.noise).toBeCloseTo(a.noise / 2, 12)
      }),
      { numRuns: 100 },
    )
  })
})

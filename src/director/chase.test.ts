import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createChase, edgeOpacity, isCaught, pushChase, soundInterval, stepChase } from './chase'

describe('chase gap', () => {
  it('adds 0.5 per push up to 6, closes after 1 s or when looking back, never below 0', () => {
    let c = createChase()
    expect(c.gap).toBe(6)
    c = pushChase(c)
    expect(c.gap).toBe(6)
    c = stepChase(c, 0.5, false)
    expect(c.gap).toBe(6)
    c = stepChase(c, 0.5, false)
    c = stepChase(c, 1, false)
    expect(c.gap).toBeCloseTo(4.5)
    c = pushChase(c)
    expect(c.gap).toBeCloseTo(5)
    c = stepChase(c, 0.5, true)
    expect(c.gap).toBeCloseTo(4.5)
    expect(isCaught(stepChase(c, 20, true))).toBe(true)
  })

  it('stays within 0..6 under any sequence', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.boolean(), fc.boolean(), fc.double({ min: 0, max: 0.05, noNaN: true })), { maxLength: 400 }), (ops) => {
        let c = createChase()
        for (const [push, look, dt] of ops) {
          if (push) c = pushChase(c)
          c = stepChase(c, dt, look)
          expect(c.gap).toBeGreaterThanOrEqual(0)
          expect(c.gap).toBeLessThanOrEqual(6)
        }
      }),
    )
  })

  it('gives the sound interval and the edge opacity', () => {
    expect(soundInterval(0)).toBeCloseTo(0.35)
    expect(soundInterval(6)).toBeCloseTo(1.25)
    expect(edgeOpacity(6)).toBeCloseTo(0.15)
    expect(edgeOpacity(0)).toBeCloseTo(1)
  })
})

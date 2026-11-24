import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  // Feature: render, Property 32: Seeded RNG range, determinism and seed sensitivity
  it('is in [0,1) and deterministic', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const a = createRng(seed)
        const b = createRng(seed)
        for (let i = 0; i < 1000; i++) {
          const v = a()
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThan(1)
          expect(b()).toBe(v)
        }
      }),
      { numRuns: 100 },
    )
  })
  it('different seeds differ in the first 16 numbers', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (s1, s2) => {
        fc.pre(s1 !== s2)
        const a = createRng(s1)
        const b = createRng(s2)
        let same = true
        for (let i = 0; i < 16; i++) if (a() !== b()) same = false
        expect(same).toBe(false)
      }),
      { numRuns: 100 },
    )
  })
  it('never throws on odd seeds', () => {
    for (const s of [NaN, Infinity, -Infinity, 1.5, -0.2, 2 ** 40]) {
      expect(() => createRng(s)()).not.toThrow()
    }
  })
})

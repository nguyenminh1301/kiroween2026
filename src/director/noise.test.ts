import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { stepNoise } from './noise'

describe('noise step', () => {
  it('stays in 0..1, caps while holding still, and keeps the moving floor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 0.05, noNaN: true }),
        fc.double({ min: 0, max: 6, noNaN: true }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (n, dt, speed, pushed, bumped, holding) => {
          const out = stepNoise(n, { dt, speed, pushed, bumped, holding })
          expect(out).toBeGreaterThanOrEqual(0)
          expect(out).toBeLessThanOrEqual(1)
          if (holding && speed < 0.05 && !pushed) expect(out).toBeLessThanOrEqual(0.1 + 1e-12)
          if (speed >= 0.05) expect(out).toBeGreaterThanOrEqual(Math.min(0.6, speed * 0.1) - 1e-12)
        },
      ),
    )
  })

  it('decays 0.3 per second and adds push and bump', () => {
    expect(stepNoise(0.8, { dt: 1, speed: 0, pushed: false, bumped: false, holding: false })).toBeCloseTo(0.5)
    expect(stepNoise(0.2, { dt: 0, speed: 0, pushed: true, bumped: false, holding: false })).toBeCloseTo(0.4)
    expect(stepNoise(0.2, { dt: 0, speed: 0, pushed: false, bumped: true, holding: false })).toBeCloseTo(0.5)
    expect(stepNoise(0, { dt: 0.016, speed: 0, pushed: false, bumped: false, holding: false })).toBe(0.12)
  })
})

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createFrameDriver, MAX_DT } from './frameDriver'

describe('frameDriver properties', () => {
  // Feature: engine-core, Property 1: Frame ordering
  it('invokes systems sorted by (priority, registration index)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ priority: fc.integer({ min: -5, max: 5 }), pausable: fc.boolean() }), {
          maxLength: 20,
        }),
        fc.boolean(),
        (specs, paused) => {
          const driver = createFrameDriver(() => paused)
          const calls: number[] = []
          specs.forEach((s, i) => {
            driver.register(`s${i}`, s.priority, () => calls.push(i), { pausable: s.pausable })
          })
          driver.step(0.016)
          const expected = specs
            .map((s, i) => ({ ...s, i }))
            .filter((s) => !(paused && s.pausable))
            .sort((a, b) => a.priority - b.priority || a.i - b.i)
            .map((s) => s.i)
          expect(calls).toEqual(expected)
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: engine-core, Property 2: Unregister stops future calls, mid-frame mutation is safe
  it('unregister, including mid-frame, never throws and stops future calls', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -3, max: 3 }), { minLength: 1, maxLength: 15 }),
        fc.array(fc.nat(14), { maxLength: 15 }),
        fc.nat(14),
        (priorities, killTargets, killer) => {
          const driver = createFrameDriver(() => false)
          const n = priorities.length
          const counts = new Array<number>(n).fill(0)
          const unregs: Array<() => void> = []
          const killed = new Set<number>()
          priorities.forEach((p, i) => {
            unregs.push(
              driver.register(`s${i}`, p, () => {
                counts[i]++
                if (i === killer % n) {
                  for (const t of killTargets) {
                    unregs[t % n]()
                    killed.add(t % n)
                  }
                }
              }),
            )
          })
          expect(() => driver.step(0.01)).not.toThrow()
          const before = counts.slice()
          expect(() => driver.step(0.01)).not.toThrow()
          for (const k of killed) expect(counts[k]).toBe(before[k])
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: engine-core, Property 3: Pausable systems and Game_Time accumulation
  it('clamps dt, skips pausable systems while paused, and accumulates Game_Time', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.double({ min: 0, max: 1, noNaN: true }), fc.boolean()), { maxLength: 40 }),
        (steps) => {
          let paused = false
          const driver = createFrameDriver(() => paused)
          const pausableDts: number[] = []
          const alwaysDts: number[] = []
          driver.register('p', 0, (dt) => pausableDts.push(dt))
          driver.register('a', 1, (dt) => alwaysDts.push(dt), { pausable: false })
          let expectedTime = 0
          let ranUnpaused = 0
          for (const [raw, p] of steps) {
            paused = p
            const clamped = Math.min(raw, MAX_DT)
            if (!p) {
              expectedTime += clamped
              ranUnpaused++
            }
            driver.step(raw)
          }
          expect(pausableDts.length).toBe(ranUnpaused)
          expect(alwaysDts.length).toBe(steps.length)
          for (const dt of [...pausableDts, ...alwaysDts]) expect(dt).toBeLessThanOrEqual(MAX_DT)
          expect(driver.getGameTime()).toBeCloseTo(expectedTime, 9)
        },
      ),
      { numRuns: 100 },
    )
  })
})

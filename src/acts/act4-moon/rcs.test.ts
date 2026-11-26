import { describe, expect, it } from 'vitest'
import { PUFF_MAX, PUFF_MIN, RCS_CLUSTERS, RCS_COUNT, SLOT, puffIn, rcsFlash, rcsMount } from './rcs'

describe('reaction control puffs', () => {
  it('has four clusters on the corners of the stage and two thrusters on each', () => {
    expect(RCS_CLUSTERS).toHaveLength(4)
    expect(RCS_COUNT).toBe(8)
    for (let i = 0; i < RCS_COUNT; i++) {
      const m = rcsMount(i)
      expect(Math.hypot(m.dir.x, m.dir.y, m.dir.z)).toBeCloseTo(1, 6)
    }
  })

  it('makes puffs of 0.1 to 0.3 s that stay inside their slot', () => {
    let n = 0
    for (let i = 0; i < RCS_COUNT; i++) {
      for (let k = 0; k < 60; k++) {
        for (const rate of [1, 2]) {
          const p = puffIn(i, k, rate)
          if (!p) continue
          n++
          expect(p.duration).toBeGreaterThanOrEqual(PUFF_MIN)
          expect(p.duration).toBeLessThanOrEqual(PUFF_MAX)
          const slot = SLOT / rate
          expect(p.start).toBeGreaterThanOrEqual(k * slot - 1e-9)
          expect(p.start + p.duration).toBeLessThanOrEqual((k + 1) * slot + 1e-9)
        }
      }
    }
    expect(n).toBeGreaterThan(100)
  })

  it('flashes now and then: quiet most of the time, on for a short moment', () => {
    for (let i = 0; i < RCS_COUNT; i++) {
      let on = 0
      let steps = 0
      for (let t = 0; t < 60; t += 0.02) {
        steps++
        if (rcsFlash(i, t) > 0) on++
      }
      expect(on / steps).toBeGreaterThan(0.02)
      expect(on / steps).toBeLessThan(0.3)
    }
    expect(rcsFlash(0, -1)).toBe(0)
  })
})

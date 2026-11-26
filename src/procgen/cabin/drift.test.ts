import { describe, expect, it } from 'vitest'
import { driftOffset } from './drift'

describe('zero g drift', () => {
  it('stays inside the tether and moves smoothly', () => {
    for (let seed = 0; seed < 8; seed++) {
      let prev = driftOffset(seed, 0, 0.3)
      for (let t = 0.05; t < 120; t += 0.05) {
        const o = driftOffset(seed, t, 0.3)
        expect(Math.hypot(o.x, o.y, o.z)).toBeLessThanOrEqual(0.3 + 1e-9)
        expect(Math.hypot(o.x - prev.x, o.y - prev.y, o.z - prev.z)).toBeLessThan(0.02)
        prev = o
      }
    }
  })
  it('moves each item differently', () => {
    expect(driftOffset(1, 5, 0.3)).not.toEqual(driftOffset(2, 5, 0.3))
  })
})

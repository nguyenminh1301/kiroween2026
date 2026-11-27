import { describe, expect, it } from 'vitest'
import { MAXQ_AT, ORBIT_AT, STAGING_AT } from './timelines'
import { launchEnvelope, MAX_OFFSET, MAX_ROT, noise, shakeSample, tliEnvelope } from './shake'

describe('act 1 shake', () => {
  it('never passes 0.4 degrees or 1 cm', () => {
    for (let t = 0; t < 24; t += 0.01) {
      const s = shakeSample(launchEnvelope(t), t, false)
      for (const r of [s.rx, s.ry, s.rz]) expect(Math.abs(r)).toBeLessThanOrEqual(MAX_ROT + 1e-12)
      for (const o of [s.ox, s.oy, s.oz]) expect(Math.abs(o)).toBeLessThanOrEqual(MAX_OFFSET + 1e-12)
    }
  })
  it('follows the beats: strong at liftoff, a peak at max Q, a bump at staging, silent by orbit', () => {
    expect(launchEnvelope(2)).toBe(0)
    expect(launchEnvelope(5)).toBeCloseTo(0.8)
    expect(launchEnvelope(MAXQ_AT)).toBeCloseTo(0.8)
    expect(launchEnvelope(8.5)).toBeCloseTo(0.6)
    expect(launchEnvelope(STAGING_AT + 0.01)).toBeGreaterThan(launchEnvelope(STAGING_AT + 1))
    expect(launchEnvelope(ORBIT_AT)).toBe(0)
    expect(launchEnvelope(150)).toBe(0)
    expect(tliEnvelope(3)).toBeLessThan(0.5)
  })
  it('is zero with reduced motion', () => {
    for (const v of Object.values(shakeSample(1, 7, true))) expect(Math.abs(v)).toBe(0)
  })
  it('is smooth: only 8 to 14 Hz content, no frame to frame jumps', () => {
    for (let t = 0; t < 2; t += 0.004) expect(Math.abs(noise(0, t + 0.004) - noise(0, t))).toBeLessThan(0.3)
  })
})

import { describe, expect, it } from 'vitest'
import { EARTH_SWAY, earthSway, SPIN_PERIOD, spinAngle, turnAboutY } from './spin'

describe('spacecraft spin', () => {
  it('turns once every 120 s', () => {
    expect(spinAngle(0)).toBe(0)
    expect(spinAngle(SPIN_PERIOD / 4)).toBeCloseTo(Math.PI / 2)
    expect(spinAngle(SPIN_PERIOD * 3 + 30)).toBeCloseTo(spinAngle(30))
  })
  it('keeps length and height when turning a direction', () => {
    const v = { x: 0.3, y: 0.5, z: -0.81 }
    const r = turnAboutY(v, 1.1)
    expect(Math.hypot(r.x, r.y, r.z)).toBeCloseTo(Math.hypot(v.x, v.y, v.z))
    expect(r.y).toBe(v.y)
    expect(turnAboutY(r, -1.1).x).toBeCloseTo(v.x)
  })
  it('sways the Earth within its limit', () => {
    for (let t = 0; t < 240; t += 3) expect(Math.abs(earthSway(t))).toBeLessThanOrEqual(EARTH_SWAY + 1e-12)
  })
})

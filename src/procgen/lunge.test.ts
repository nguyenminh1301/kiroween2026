import { describe, expect, it } from 'vitest'
import { APPEAR_END, JOLT_AT, LUNGE_TOTAL, lungeDistance, lungeFrame, OPEN_END, SLAM_END } from './lunge'

describe('swallow timeline', () => {
  it('takes under one second: in front in 0.25 s, jaws wide by 0.6 s, slammed and black at 0.8 s', () => {
    expect(LUNGE_TOTAL).toBeLessThan(1)
    expect(APPEAR_END).toBe(0.25)
    expect(OPEN_END - APPEAR_END).toBeCloseTo(0.35)
    expect(lungeFrame(0)).toEqual({ rise: 0, reach: 0, jaw: 0, cover: 0, jolt: 0 })
    expect(lungeFrame(APPEAR_END).reach).toBe(1)
    expect(lungeFrame(OPEN_END - 1e-9).jaw).toBeCloseTo(1, 3)
    expect(lungeFrame(JOLT_AT).jolt).toBe(1)
    expect(lungeFrame(SLAM_END - 0.01).cover).toBe(0)
    expect(lungeFrame(SLAM_END - 0.01).jaw).toBeLessThan(0.15)
  })

  it('cuts to black with no fade: cover is 0 or 1 and never in between', () => {
    for (let t = 0; t <= 1.5; t += 0.01) expect([0, 1]).toContain(lungeFrame(t).cover)
    expect(lungeFrame(SLAM_END).cover).toBe(1)
    expect(lungeFrame(5).cover).toBe(1)
  })

  it('opens before the scream, slams after it, and the camera comes closer', () => {
    let prev = lungeFrame(0)
    for (let t = 0.01; t < OPEN_END; t += 0.01) {
      const f = lungeFrame(t)
      expect(f.jaw).toBeGreaterThanOrEqual(prev.jaw)
      expect(f.reach).toBeGreaterThanOrEqual(prev.reach)
      prev = f
    }
    prev = lungeFrame(OPEN_END)
    for (let t = OPEN_END; t < SLAM_END; t += 0.01) {
      const f = lungeFrame(t)
      expect(f.jaw).toBeLessThanOrEqual(prev.jaw + 1e-9)
      prev = f
    }
    expect(lungeDistance(1)).toBeLessThan(lungeDistance(0))
  })
})

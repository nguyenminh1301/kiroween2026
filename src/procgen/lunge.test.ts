import { describe, expect, it } from 'vitest'
import { APPEAR_END, BITE_END, HOLD_END, JOLT_AT, LUNGE_TOTAL, lungeFrame, OPEN_END } from './lunge'

describe('swallow timeline', () => {
  it('takes 1.5 s: face in front by 0.3, held 0.4, open 0.5, bite 0.3, then black', () => {
    expect(LUNGE_TOTAL).toBeCloseTo(1.5)
    expect(APPEAR_END).toBeCloseTo(0.3)
    expect(HOLD_END - APPEAR_END).toBeCloseTo(0.4)
    expect(OPEN_END - HOLD_END).toBeCloseTo(0.5)
    expect(BITE_END - OPEN_END).toBeCloseTo(0.3)
    expect(JOLT_AT).toBe(OPEN_END)
  })

  it('holds the face in front of the camera, jaw shut and teeth away, for 0.4 s', () => {
    const start = lungeFrame(APPEAR_END)
    for (let t = APPEAR_END; t < HOLD_END; t += 0.01) {
      const f = lungeFrame(t)
      expect(f.dist).toBeCloseTo(start.dist, 6)
      expect(f.jaw).toBe(0)
      expect(f.bite).toBe(0)
      expect(f.cover).toBe(0)
    }
    expect(lungeFrame(0).dist).toBeGreaterThan(lungeFrame(APPEAR_END).dist)
  })

  it('opens the head over 0.5 s with no bite and no jolt, then bites over 0.3 s with jolt and red flash', () => {
    expect(lungeFrame(HOLD_END + 0.01).jaw).toBeLessThan(0.1)
    expect(lungeFrame(OPEN_END - 1e-6).jaw).toBeCloseTo(1, 3)
    for (let t = HOLD_END; t < OPEN_END; t += 0.01) {
      const f = lungeFrame(t)
      expect(f.bite).toBe(0)
      expect(f.jolt).toBe(0)
      expect(f.flash).toBe(0)
    }
    expect(lungeFrame(OPEN_END).jolt).toBe(1)
    expect(lungeFrame(OPEN_END).flash).toBeGreaterThan(0.9)
    let prev = 0
    for (let t = OPEN_END; t < BITE_END; t += 0.01) {
      const f = lungeFrame(t)
      expect(f.bite).toBeGreaterThanOrEqual(prev)
      expect(f.jaw).toBeCloseTo(1, 6)
      expect(f.flash).toBeGreaterThan(0)
      prev = f.bite
    }
    expect(lungeFrame(BITE_END - 0.005).bite).toBeGreaterThan(0.95)
  })

  it('cuts to black with no fade: cover is 0 or 1 and never in between', () => {
    for (let t = 0; t <= 2.5; t += 0.01) expect([0, 1]).toContain(lungeFrame(t).cover)
    expect(lungeFrame(BITE_END - 0.01).cover).toBe(0)
    expect(lungeFrame(BITE_END).cover).toBe(1)
    expect(lungeFrame(5).cover).toBe(1)
    expect(lungeFrame(BITE_END).jolt).toBe(0)
    expect(lungeFrame(BITE_END).flash).toBe(0)
  })

  it('comes closer as it goes and the head only grows', () => {
    let prev = lungeFrame(0)
    for (let t = 0.01; t < BITE_END; t += 0.01) {
      const f = lungeFrame(t)
      expect(f.dist).toBeLessThanOrEqual(prev.dist + 1e-9)
      expect(f.headScale).toBeGreaterThanOrEqual(prev.headScale - 1e-9)
      prev = f
    }
  })
})

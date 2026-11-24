import { describe, expect, it } from 'vitest'
import { nextLevel } from './adaptiveDecision'

/** Mimics the scaler: a 500 ms decision cadence, samples cleared on change. */
function simulate(start: number, frameAt: (ms: number) => number, totalMs: number) {
  let level = start
  let samples: number[] = []
  let sinceChange = 0
  let sinceDecision = 0
  let t = 0
  const changes: { t: number; level: number }[] = []
  while (t < totalMs) {
    const f = frameAt(t)
    samples.push(f)
    t += f
    sinceChange += f
    sinceDecision += f
    if (sinceDecision >= 500) {
      sinceDecision = 0
      const n = nextLevel(level, samples, sinceChange)
      if (n !== level) {
        level = n
        samples = []
        sinceChange = 0
        changes.push({ t, level })
      }
    }
  }
  return { level, changes }
}

describe('nextLevel basics', () => {
  it('holds during settle time and on empty input', () => {
    expect(nextLevel(1, new Array(200).fill(30), 2999)).toBe(1)
    expect(nextLevel(1, [], 9999)).toBe(1)
  })
  it('ignores bad samples', () => {
    expect(nextLevel(1, [NaN, -5, Infinity], 5000)).toBe(1)
  })
})

describe('nextLevel simulations', () => {
  it('steady 30 ms steps down once per 3 s to level 3 and stays', () => {
    const r = simulate(0, () => 30, 30000)
    expect(r.level).toBe(3)
    expect(r.changes.length).toBe(3)
    for (let i = 1; i < r.changes.length; i++) {
      expect(r.changes[i].t - r.changes[i - 1].t).toBeGreaterThanOrEqual(3000)
    }
  })
  it('steady 8 ms steps up to level 0 (960x540) and stays', () => {
    const r = simulate(3, () => 8, 60000)
    expect(r.level).toBe(0)
    expect(r.changes.length).toBe(3)
  })
  it('a single 200 ms spike does not step down', () => {
    const r = simulate(1, (t) => (t >= 10000 && t < 10010 ? 200 : 10), 4900)
    expect(r.changes.filter((c) => c.level > 1)).toEqual([])
    const direct = nextLevel(1, [...new Array(100).fill(10), 200, ...new Array(50).fill(10)], 5000)
    expect(direct).toBe(1)
  })
  it('alternating slow and fast seconds never change level more often than every 3 s', () => {
    const r = simulate(1, (t) => (Math.floor(t / 1000) % 2 === 0 ? 30 : 8), 120000)
    for (let i = 1; i < r.changes.length; i++) {
      expect(r.changes[i].t - r.changes[i - 1].t).toBeGreaterThanOrEqual(3000)
    }
  })
})

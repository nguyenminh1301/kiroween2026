import { describe, expect, it } from 'vitest'
import { nextLevel } from './adaptiveDecision'
import { levelCount } from './levelTable'

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
  it('steady 30 ms steps down once per 3 s to the last level and stays', () => {
    const r = simulate(0, () => 30, 30000)
    expect(r.level).toBe(levelCount() - 1)
    expect(r.changes.length).toBe(levelCount() - 1)
    for (let i = 1; i < r.changes.length; i++) {
      expect(r.changes[i].t - r.changes[i - 1].t).toBeGreaterThanOrEqual(3000)
    }
  })
  it('a 60 Hz run (16.7 ms frames) climbs back to the top', () => {
    const r = simulate(levelCount() - 1, () => 16.7, 60000)
    expect(r.level).toBe(0)
  })
  it('a 60 Hz run with small jitter still climbs', () => {
    const r = simulate(2, (t) => 16.2 + (Math.floor(t / 17) % 3) * 0.4, 30000)
    expect(r.level).toBe(0)
  })
  it('a 144 Hz run climbs', () => {
    expect(simulate(2, () => 6.9, 30000).level).toBe(0)
  })
  it('a 30 fps run (33 ms) never climbs', () => {
    const r = simulate(2, () => 33.3, 20000)
    expect(r.changes.every((c) => c.level >= 2)).toBe(true)
  })
  it('a 20 ms run (50 fps) holds: not slow enough to drop, not fast enough to climb', () => {
    expect(simulate(2, () => 20, 40000).changes).toEqual([])
  })
  it('a short spike does not drop the level', () => {
    const frame = (t: number) => (t >= 6000 && t < 7500 ? 40 : 16.7)
    expect(simulate(1, frame, 12000).changes.filter((c) => c.level > 1)).toEqual([])
    const direct = nextLevel(1, [...new Array(300).fill(16.7), ...new Array(25).fill(40)], 5000)
    expect(direct).toBeLessThanOrEqual(1)
  })
  it('slow frames for 3 s drop one level', () => {
    expect(nextLevel(1, new Array(100).fill(30), 5000)).toBe(2)
  })
  it('respects top, floor and the climb block', () => {
    expect(nextLevel(3, new Array(100).fill(60), 5000, { floor: 3 })).toBe(3)
    expect(nextLevel(2, new Array(400).fill(8), 9000, { top: 2 })).toBe(2)
    expect(nextLevel(2, new Array(400).fill(8), 9000, { upBlocked: true })).toBe(2)
    expect(nextLevel(5, new Array(400).fill(8), 9000, { top: 1, floor: 3 })).toBe(3)
  })
  it('alternating slow and fast seconds never change level more often than every 3 s', () => {
    const r = simulate(1, (t) => (Math.floor(t / 1000) % 2 === 0 ? 30 : 8), 120000)
    for (let i = 1; i < r.changes.length; i++) {
      expect(r.changes[i].t - r.changes[i - 1].t).toBeGreaterThanOrEqual(3000)
    }
  })
})

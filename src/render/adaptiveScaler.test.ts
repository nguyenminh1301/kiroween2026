import { describe, expect, it } from 'vitest'
import { createAdaptiveScaler } from './adaptiveScaler'
import { lowestLevelAtLeast, lookupLevel } from './levelTable'

function run(s: ReturnType<typeof createAdaptiveScaler>, ms: number, frame: number): void {
  for (let t = 0; t < ms; t += frame) s.step(frame)
}

describe('adaptive scaler', () => {
  it('climbs back at 60 Hz after a slow stretch', () => {
    const s = createAdaptiveScaler({ initialLevel: 0 })
    run(s, 9000, 40)
    expect(s.getLevel()).toBeGreaterThan(0)
    const low = s.getLevel()
    run(s, 80000, 16.7)
    expect(s.getLevel()).toBeLessThan(low)
    expect(s.getLevel()).toBe(0)
  })
  it('does not climb for 30 s after a drop', () => {
    const s = createAdaptiveScaler({ initialLevel: 0 })
    run(s, 3600, 40)
    const dropped = s.getLevel()
    expect(dropped).toBeGreaterThan(0)
    run(s, 25000, 16.7)
    expect(s.getLevel()).toBe(dropped)
  })
  it('never goes below 640 wide by itself', () => {
    const s = createAdaptiveScaler({ initialLevel: 0 })
    run(s, 60000, 45)
    expect(lookupLevel(s.getLevel()).width).toBe(640)
    expect(s.getLevel()).toBe(lowestLevelAtLeast(640))
  })
  it('ignores a hold, and paused time', () => {
    let paused = false
    const s = createAdaptiveScaler({ initialLevel: 0, isPaused: () => paused })
    paused = true
    run(s, 20000, 45)
    expect(s.getLevel()).toBe(0)
    paused = false
    s.hold(4000)
    run(s, 3900, 45)
    expect(s.getLevel()).toBe(0)
    expect(s.sampleCount()).toBe(0)
  })
  it('a short spike does not drop the level', () => {
    const s = createAdaptiveScaler({ initialLevel: 0 })
    run(s, 8000, 16.7)
    run(s, 1200, 45)
    run(s, 8000, 16.7)
    expect(s.getLevel()).toBe(0)
  })
  it('setRange clamps the level', () => {
    const s = createAdaptiveScaler({ initialLevel: 0 })
    s.setRange(2, 3)
    expect(s.getLevel()).toBe(2)
    s.setRange(0, 1)
    expect(s.getLevel()).toBe(1)
  })
})

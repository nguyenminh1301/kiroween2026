import { describe, expect, it } from 'vitest'
import type { Flash } from '../../engine/fx'
import { createSleepTimer } from './sleepTimer'

function setup() {
  const log: string[] = []
  let flashes: Flash[] = []
  let seed = 1
  const timer = createSleepTimer({
    rng: () => ((seed = (seed * 16807) % 2147483647) / 2147483647),
    whisper: (id) => log.push(id),
    setBlackout: () => {},
    setFlashes: (f) => (flashes = f),
    breathe: () => log.push('breathe'),
    fourthSleeper: () => log.push('fourth'),
    complete: () => log.push('complete'),
  })
  const run = (seconds: number, closed: boolean): void => {
    for (let i = 0; i < Math.round(seconds * 20); i++) timer.tick(0.05, closed)
  }
  return { timer, log, run, flashes: () => flashes }
}

describe('sleep timer', () => {
  it('adds up closed time over several presses and plays each line once', () => {
    const s = setup()
    s.run(1, true)
    s.run(0.5, false)
    s.run(0.9, true)
    expect(s.timer.closedTime()).toBeCloseTo(1.9, 5)
    expect(s.log.filter((l) => l === 'act2.flashes')).toHaveLength(1)
    s.run(1, false)
    s.run(2.2, true)
    s.run(1, true)
    expect(s.log.filter((l) => l === 'act2.flashes')).toHaveLength(1)
    expect(s.log.filter((l) => l === 'act2.breath')).toHaveLength(1)
    expect(s.log.filter((l) => l === 'breathe').length).toBeGreaterThan(0)
    expect(s.flashes().length).toBeLessThanOrEqual(6)
  })

  it('completes after 11 s of closed time and not before', () => {
    const s = setup()
    s.run(5, true)
    s.run(3, false)
    s.run(5.9, true)
    expect(s.timer.closedTime()).toBeCloseTo(10.9, 5)
    expect(s.log).not.toContain('fourth')
    expect(s.log).not.toContain('complete')
    s.run(0.2, true)
    expect(s.log).toContain('fourth')
    expect(s.flashes().some((f) => f.figure)).toBe(true)
    expect(s.log).not.toContain('complete')
    s.run(1.0, true)
    expect(s.log).not.toContain('complete')
    s.run(0.3, true)
    expect(s.log.filter((l) => l === 'complete')).toHaveLength(1)
    expect(s.log.filter((l) => l === 'fourth')).toHaveLength(1)
  })
})

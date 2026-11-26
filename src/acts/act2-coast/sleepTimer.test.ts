import { describe, expect, it } from 'vitest'
import { COMPLETE_AT, createSleepTimer, FADE_SECONDS, NOTICE_AT, RHYTHMS } from './sleepTimer'

function setup() {
  const log: string[] = []
  const breaths = [0, 0, 0, 0]
  let black = 0
  let hum = 1
  const t = createSleepTimer({
    setBlackout: (v) => (black = v),
    setHum: (v) => (hum = v),
    breathe: (i) => {
      breaths[i]++
      log.push(`breath${i}`)
    },
    fourthSleeper: () => log.push('fourth'),
    complete: () => log.push('complete'),
  })
  const run = (seconds: number, closed: boolean) => {
    for (let i = 0; i < Math.round(seconds * 20); i++) t.tick(0.05, closed)
  }
  return { t, log, breaths, run, black: () => black, hum: () => hum }
}

describe('act 2 bedtime', () => {
  it('fades to black over two seconds and drops the hum', () => {
    const s = setup()
    s.run(1, true)
    expect(s.black()).toBeCloseTo(1 / FADE_SECONDS, 1)
    s.run(1.1, true)
    expect(s.black()).toBe(1)
    expect(s.hum()).toBeLessThan(0.2)
  })

  it('brings the view back when the eyes open', () => {
    const s = setup()
    s.run(2.5, true)
    s.run(1, false)
    expect(s.black()).toBe(0)
    expect(s.hum()).toBe(1)
  })

  it('plays four breathing rhythms at four different rates, and no flashes or stings', () => {
    const s = setup()
    s.run(11, true)
    expect(s.breaths.every((n) => n > 0)).toBe(true)
    expect(new Set(RHYTHMS).size).toBe(4)
    expect(s.breaths[0]).toBeGreaterThan(s.breaths[3])
    expect(s.log.some((l) => /flash|sting/.test(l))).toBe(false)
  })

  it('marks the fourth sleeper after six seconds in a row, not before, and not with short blinks', () => {
    const s = setup()
    s.run(NOTICE_AT - 0.5, true)
    expect(s.log).not.toContain('fourth')
    s.run(0.1, false)
    s.run(NOTICE_AT - 0.5, true)
    expect(s.log).not.toContain('fourth')
    s.run(1, true)
    expect(s.log.filter((l) => l === 'fourth').length).toBe(1)
  })

  it('completes once, after the total closed time', () => {
    const s = setup()
    s.run(COMPLETE_AT + 1, true)
    expect(s.log.filter((l) => l === 'complete').length).toBe(1)
    expect(s.t.finished()).toBe(true)
  })
})

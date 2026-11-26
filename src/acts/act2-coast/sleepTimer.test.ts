import { describe, expect, it } from 'vitest'
import { COMPLETE_AT, createSleepTimer, FADE_SECONDS } from './sleepTimer'

function setup() {
  const log: string[] = []
  let black = 0
  let hum = 1
  const t = createSleepTimer({
    setBlackout: (v) => (black = v),
    setHum: (v) => (hum = v),
    complete: () => log.push('complete'),
  })
  const run = (seconds: number, closed: boolean) => {
    for (let i = 0; i < Math.round(seconds * 20); i++) t.tick(0.05, closed)
  }
  return { t, log, run, black: () => black, hum: () => hum }
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

  it('ends a few quiet seconds after the fade, once, and does not end early', () => {
    const s = setup()
    s.run(COMPLETE_AT - 0.5, true)
    expect(s.log).toEqual([])
    s.run(1, true)
    s.run(3, true)
    expect(s.log).toEqual(['complete'])
    expect(s.t.finished()).toBe(true)
    expect(COMPLETE_AT).toBeGreaterThan(FADE_SECONDS)
  })
})

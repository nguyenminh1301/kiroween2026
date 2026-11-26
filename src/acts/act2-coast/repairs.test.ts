import { describe, expect, it } from 'vitest'
import { BAND_HI, BAND_LO, createRepairs, knobToPsi, repairObjective } from './repairs'

const holdKnobAt = (r: ReturnType<typeof createRepairs>, psi: number) => {
  r.s.knob = (psi - 2.5) / 5
}

describe('oxygen line', () => {
  it('needs the hammer, then exactly three taps', () => {
    const r = createRepairs()
    expect(r.tap()).toBe(0)
    expect(r.takeHammer()).toBe(true)
    expect(r.takeHammer()).toBe(false)
    expect([r.tap(), r.tap()]).toEqual([1, 2])
    expect(r.s.o2Done).toBe(false)
    expect(r.tap()).toBe(3)
    expect(r.s.o2Done).toBe(true)
    expect(r.tap()).toBe(0)
  })
})

describe('cabin pressure', () => {
  it('starts low, follows the knob and clicks in after one second in the band', () => {
    const r = createRepairs()
    expect(r.s.needle).toBeLessThan(BAND_LO)
    expect(r.openGauge()).toBe(true)
    holdKnobAt(r, 5)
    let done: string | null = null
    let t = 0
    while (!done && t < 5) {
      done = r.tick(0.05)
      t += 0.05
    }
    expect(done).toBe('press')
    expect(t).toBeGreaterThan(1)
    expect(t).toBeLessThan(2.5)
    expect(r.s.pressDone).toBe(true)
    expect(r.s.gaugeOpen).toBe(false)
    expect(knobToPsi(r.s.knob)).toBeGreaterThanOrEqual(BAND_LO)
    expect(knobToPsi(r.s.knob)).toBeLessThanOrEqual(BAND_HI)
  })
  it('resets the hold when the needle leaves the band', () => {
    const r = createRepairs()
    r.openGauge()
    holdKnobAt(r, 5)
    for (let i = 0; i < 40; i++) r.tick(0.05)
    expect(r.s.pressDone).toBe(true)
    const q = createRepairs()
    q.openGauge()
    holdKnobAt(q, 5)
    for (let i = 0; i < 12; i++) q.tick(0.05)
    holdKnobAt(q, 6.5)
    for (let i = 0; i < 30; i++) q.tick(0.05)
    expect(q.s.held).toBe(0)
    expect(q.s.pressDone).toBe(false)
  })
  it('turns only while open and clamps the knob', () => {
    const r = createRepairs()
    r.turn(0.5)
    expect(r.s.knob).toBeCloseTo(0.1)
    r.openGauge()
    r.turn(5)
    expect(r.s.knob).toBe(1)
    r.turn(-5)
    expect(r.s.knob).toBe(0)
  })
})

describe('computer', () => {
  it('clears three lines, each once, then shows OK', () => {
    const r = createRepairs()
    expect(r.clearLine(1)).toBe(true)
    expect(r.clearLine(1)).toBe(false)
    expect(r.s.compDone).toBe(false)
    r.clearLine(0)
    r.clearLine(2)
    expect(r.s.compDone).toBe(true)
  })
})

describe('objective', () => {
  it('lists what is left and frames what can be used now', () => {
    const r = createRepairs()
    let o = repairObjective(r.s)
    expect(o.markers).toEqual(['act2:pouch', 'act2:gauge', 'act2:comp0', 'act2:comp1', 'act2:comp2'])
    r.takeHammer()
    r.clearLine(0)
    o = repairObjective(r.s)
    expect(o.markers).toContain('act2:joint')
    expect(o.markers).not.toContain('act2:comp0')
    expect(o.text).toContain('tap the joint')
  })
  it('is all done only when every repair is', () => {
    const r = createRepairs()
    expect(r.allDone()).toBe(false)
    r.takeHammer()
    r.tap(); r.tap(); r.tap()
    r.s.pressDone = true
    r.clearLine(0); r.clearLine(1); r.clearLine(2)
    expect(r.allDone()).toBe(true)
    expect(r.doneCount()).toBe(3)
  })
})

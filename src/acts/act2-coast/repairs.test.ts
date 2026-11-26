import { describe, expect, it } from 'vitest'
import { BAND_HI, BAND_LO, createRepairs, knobToPsi, PANEL_CARD, PANEL_START, repairObjective, SITE_DIGITS } from './repairs'

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

describe('breaker panel', () => {
  it('starts wrong, flips only while open, and finishes when it matches the card', () => {
    const r = createRepairs()
    expect(r.flip(0)).toBe(false)
    expect(r.s.panel[0]).toBe(false)
    expect(r.openPanel()).toBe(true)
    const wrong = PANEL_CARD.map((v, i) => (v !== PANEL_START[i] ? i : -1)).filter((i) => i >= 0)
    expect(wrong.length).toBeGreaterThan(1)
    wrong.slice(0, -1).forEach((i) => expect(r.flip(i)).toBe(false))
    expect(r.s.panelDone).toBe(false)
    expect(r.flip(wrong[wrong.length - 1])).toBe(true)
    expect(r.s.panelDone).toBe(true)
    expect(r.s.panelOpen).toBe(false)
    expect(r.flip(0)).toBe(false)
  })
})

describe('landing site keypad', () => {
  const type = (r: ReturnType<typeof createRepairs>, s: string) => [...s].forEach((c) => r.digit(c))
  it('takes five digits, ENTR on a wrong number lights OPR ERR and clears the entry', () => {
    const r = createRepairs()
    expect(r.digit('1')).toBe(false)
    r.openKeypad()
    type(r, '123456')
    expect(r.s.entry).toBe('12345')
    expect(r.enter()).toBe('err')
    expect(r.s.oprErr).toBe(true)
    expect(r.s.entry).toBe('')
    expect(r.s.siteDone).toBe(false)
    r.digit('7')
    expect(r.s.oprErr).toBe(false)
  })
  it('does nothing on ENTR with fewer than five digits, then accepts the right number', () => {
    const r = createRepairs()
    r.openKeypad()
    type(r, SITE_DIGITS.slice(0, 4))
    expect(r.enter()).toBe('short')
    expect(r.s.oprErr).toBe(false)
    r.backspace()
    type(r, SITE_DIGITS.slice(3))
    expect(r.enter()).toBe('ok')
    expect(r.s.siteDone).toBe(true)
    expect(r.s.keypadOpen).toBe(false)
  })
  it('ignores letters', () => {
    const r = createRepairs()
    r.openKeypad()
    expect(r.digit('a')).toBe(false)
    expect(r.digit('12')).toBe(false)
  })
})

describe('objective', () => {
  it('lists what is left and frames what can be used now', () => {
    const r = createRepairs()
    let o = repairObjective(r.s)
    expect(o.markers).toEqual(['act2:pouch', 'act2:gauge', 'act2:panel', 'act2:keypad'])
    r.takeHammer()
    r.s.panelDone = true
    o = repairObjective(r.s)
    expect(o.markers).toContain('act2:joint')
    expect(o.markers).not.toContain('act2:panel')
    expect(o.text).toContain('tap the joint')
  })
  it('is all done only when every repair is', () => {
    const r = createRepairs()
    expect(r.allDone()).toBe(false)
    r.takeHammer()
    r.tap(); r.tap(); r.tap()
    r.s.pressDone = true
    r.s.panelDone = true
    expect(r.allDone()).toBe(false)
    r.s.siteDone = true
    expect(r.allDone()).toBe(true)
    expect(r.doneCount()).toBe(4)
  })
})

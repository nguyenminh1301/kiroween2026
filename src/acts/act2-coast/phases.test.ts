import { describe, expect, it } from 'vitest'
import { createPhases } from './phases'

describe('act 2 phases', () => {
  it('grows the tunnel once, on the first visit to the lander', () => {
    const p = createPhases()
    expect(p.crossBack()).toBe(false)
    expect(p.enterLander()).toBe(true)
    expect(p.enterLander()).toBe(false)
  })

  it('opens the bag only after the repairs and one trip back', () => {
    const p = createPhases()
    expect(p.enabled('act2:bag')).toBe(false)
    p.enterLander()
    p.setRepairsDone(true)
    expect(p.phase()).toBe('repairs')
    expect(p.crossBack()).toBe(true)
    expect(p.crossBack()).toBe(false)
    expect(p.phase()).toBe('sleep')
    expect(p.enabled('act2:bag')).toBe(true)
  })

  it('also works when the last repair is done after the trip back', () => {
    const p = createPhases()
    p.enterLander()
    p.crossBack()
    expect(p.phase()).toBe('repairs')
    p.setRepairsDone(true)
    expect(p.phase()).toBe('sleep')
  })

  it('enters the bag once and finishes only from the bag', () => {
    const p = createPhases()
    p.enterLander()
    p.crossBack()
    p.setRepairsDone(true)
    expect(p.finish()).toBe(false)
    expect(p.enterBag()).toBe(true)
    expect(p.enterBag()).toBe(false)
    expect(p.enabled('act2:bag')).toBe(false)
    expect(p.finish()).toBe(true)
    expect(p.phase()).toBe('done')
  })
})

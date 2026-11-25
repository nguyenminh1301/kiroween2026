import { describe, expect, it } from 'vitest'
import { createPhases, type Act2Interactable } from './phases'

const IDS: Act2Interactable[] = ['act2:pen', 'act2:breaker', 'act2:bag']
const enabled = (p: ReturnType<typeof createPhases>) => IDS.filter((id) => p.enabled(id))

describe('act 2 phase machine', () => {
  it('walks outbound, fix, return, sleep, done with each interactable only in its phase', () => {
    const p = createPhases()
    expect(p.phase()).toBe('outbound')
    expect(enabled(p)).toEqual([])
    expect(p.takePen()).toBe(false)
    expect(p.crossCm()).toBe(false)

    expect(p.crossLander()).toBe(true)
    expect(p.crossLander()).toBe(false)
    expect(p.phase()).toBe('fix')
    expect(enabled(p)).toEqual(['act2:pen'])
    expect(p.fixBreaker()).toBe(false)

    expect(p.takePen()).toBe(true)
    expect(p.takePen()).toBe(false)
    expect(p.holdingPen()).toBe(true)
    expect(enabled(p)).toEqual(['act2:breaker'])

    expect(p.fixBreaker()).toBe(true)
    expect(p.phase()).toBe('return')
    expect(enabled(p)).toEqual([])

    expect(p.crossCm()).toBe(true)
    expect(p.phase()).toBe('sleep')
    expect(enabled(p)).toEqual(['act2:bag'])
    expect(p.finish()).toBe(false)

    expect(p.enterBag()).toBe(true)
    expect(p.enterBag()).toBe(false)
    expect(enabled(p)).toEqual([])
    expect(p.finish()).toBe(true)
    expect(p.phase()).toBe('done')
    expect(enabled(p)).toEqual([])
  })
})

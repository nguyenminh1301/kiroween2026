import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { ACT_ORDER, nextAct } from './actOrder'

describe('actOrder', () => {
  // Feature: engine-core, Property 45: Act order traversal
  it('nextAct returns the following act, null after act5-home', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACT_ORDER), (id) => {
        const i = ACT_ORDER.indexOf(id)
        if (id === 'act5-home') expect(nextAct(id)).toBeNull()
        else expect(nextAct(id)).toBe(ACT_ORDER[i + 1])
      }),
      { numRuns: 100 },
    )
  })

  it('lists the six acts in play order', () => {
    expect(ACT_ORDER).toHaveLength(6)
    expect(ACT_ORDER[0]).toBe('act0-pad')
    expect(ACT_ORDER[5]).toBe('act5-home')
  })
})

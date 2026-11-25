import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { TensionState } from '../types'
import { applyTension, createTension, FEAR_TARGET, nextTension, stepHeartRate, stepTension, type TensionEvent } from './tension'

const STATES: TensionState[] = ['CALM', 'UNEASE', 'STALK', 'CHASE', 'RELEASE']
const EVENTS: TensionEvent[] = ['calm', 'unease', 'stalk', 'heard', 'chaseStart', 'chaseEnd']

describe('tension', () => {
  it('only makes legal moves', () => {
    fc.assert(
      fc.property(fc.constantFrom(...STATES), fc.constantFrom(...EVENTS), (s, e) => {
        const n = nextTension(s, e)
        if (n === s) return
        if (e === 'heard') expect([s, n]).toEqual(['STALK', 'CHASE'])
        if (e === 'chaseEnd') expect([s, n]).toEqual(['CHASE', 'RELEASE'])
        if (e === 'calm') expect(n).toBe(s === 'CHASE' ? 'RELEASE' : 'CALM')
        if ((e === 'stalk' || e === 'unease') && s === 'CHASE') throw new Error('ignored in chase')
        if (e === 'chaseStart') expect(n).toBe('CHASE')
      }),
    )
  })

  it('settles RELEASE to UNEASE after 6 s and moves fear at 0.3 per second', () => {
    let t = applyTension(createTension('CHASE'), 'chaseEnd')
    expect(t.state).toBe('RELEASE')
    for (let i = 0; i < 23; i++) t = stepTension(t, 0.25)
    expect(t.state).toBe('RELEASE')
    t = stepTension(t, 0.25)
    expect(t.state).toBe('UNEASE')
    const f = stepTension(createTension('CALM', 0), 1)
    expect(f.fear).toBe(0)
    const g = stepTension({ ...createTension('CHASE', 0), fear: 0 }, 1)
    expect(g.fear).toBeCloseTo(0.3)
    expect(FEAR_TARGET.CHASE).toBe(0.9)
  })

  it('moves heart rate toward 70 + 100 * fear, faster while holding, clamped', () => {
    expect(stepHeartRate(95, 0.9, false, 1)).toBeCloseTo(115)
    expect(stepHeartRate(95, 0.9, true, 1)).toBeCloseTo(123)
    expect(stepHeartRate(179, 1, true, 5)).toBe(180)
    expect(stepHeartRate(52, 0, false, 10)).toBe(70)
    expect(stepHeartRate(40, 0, false, 0)).toBe(50)
  })
})

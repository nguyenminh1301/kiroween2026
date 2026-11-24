import { describe, expect, it } from 'vitest'
import { viewDirection } from '../../interaction/targeting'
import { crowdAim, decayExcitement } from './crowdLogic'

describe('crowd aim rule', () => {
  it('counts looking down over either railing', () => {
    expect(crowdAim(viewDirection(-1.2, -0.5))).toBe(true)
    expect(crowdAim(viewDirection(1.2, -0.5))).toBe(true)
  })

  it('does not count looking ahead, up, or straight down the walkway floor', () => {
    expect(crowdAim(viewDirection(0, 0))).toBe(false)
    expect(crowdAim(viewDirection(0, -0.6))).toBe(false)
    expect(crowdAim(viewDirection(-1.2, 0.4))).toBe(false)
    expect(crowdAim(viewDirection(-1.2, -0.1))).toBe(false)
  })

  it('lets excitement fall back to 0.15 in about 15 s', () => {
    let e = 1
    for (let i = 0; i < 15 * 20; i++) e = decayExcitement(e, 0.05)
    expect(e).toBeCloseTo(0.15, 2)
  })
})

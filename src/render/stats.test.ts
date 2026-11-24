import { describe, expect, it } from 'vitest'
import { smoothEma } from './stats'

describe('smoothEma', () => {
  it('starts at the first sample and moves a fraction toward new ones', () => {
    expect(smoothEma(null, 16)).toBe(16)
    expect(smoothEma(10, 20)).toBeCloseTo(11, 12)
  })
})

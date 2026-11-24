import { describe, expect, it } from 'vitest'
import { QUINDAR, quindarFreqs } from './quindar'

describe('quindarFreqs', () => {
  it('is 2525 before and 2475 after with no detune', () => {
    expect(quindarFreqs(undefined)).toEqual({ pre: 2525, post: 2475 })
    expect(quindarFreqs(0)).toEqual({ pre: 2525, post: 2475 })
  })
  it('adds detune to both', () => {
    expect(quindarFreqs(7)).toEqual({ pre: 2532, post: 2482 })
    expect(quindarFreqs(-3)).toEqual({ pre: 2522, post: 2472 })
  })
  it('treats NaN and Infinity as 0', () => {
    expect(quindarFreqs(NaN)).toEqual({ pre: 2525, post: 2475 })
    expect(quindarFreqs(Infinity)).toEqual({ pre: 2525, post: 2475 })
  })
  it('has the 0.25 s tone length', () => {
    expect(QUINDAR.seconds).toBe(0.25)
  })
})

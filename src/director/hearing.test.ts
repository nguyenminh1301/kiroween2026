import { describe, expect, it } from 'vitest'
import { canHear, canSee, hearingThreshold } from './hearing'

describe('hearing', () => {
  it('uses 0.25 + 0.04 * distance', () => {
    expect(hearingThreshold(0)).toBeCloseTo(0.25)
    expect(hearingThreshold(5)).toBeCloseTo(0.45)
  })
  it('hears nothing beyond 6.5 m or from a hidden player holding their breath', () => {
    expect(canHear(1, 6.6, false, false)).toBe(false)
    expect(canHear(1, 6.5, false, false)).toBe(true)
    expect(canHear(1, 2, true, true)).toBe(false)
    expect(canHear(1, 2, true, false)).toBe(true)
    expect(canHear(0.3, 2, false, false)).toBe(false)
    // Walking (0.3) is heard from about a metre.
    expect(canHear(0.3, 1, false, false)).toBe(true)
  })
  it('sees close in any direction, and ahead at 3.5 m', () => {
    const c = { x: 0, y: 0, z: 0 }
    // heading 0 faces -z.
    expect(canSee(c, 0, { x: 0, y: 0, z: 1 }, false)).toBe(true)
    expect(canSee(c, 0, { x: 0, y: 0, z: 2 }, false)).toBe(false)
    expect(canSee(c, 0, { x: 0, y: 0, z: -3 }, false)).toBe(true)
    expect(canSee(c, 0, { x: 0, y: 0, z: -4 }, false)).toBe(false)
    expect(canSee(c, 0, { x: 0, y: 0, z: -1 }, true)).toBe(false)
  })
})

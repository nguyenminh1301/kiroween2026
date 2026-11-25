import { describe, expect, it } from 'vitest'
import { createBreath, stepBreath } from './breath'

describe('breath hold', () => {
  it('holds up to 8 s, is forced out, and needs a release', () => {
    let s = createBreath()
    for (let i = 0; i < 31; i++) s = stepBreath(s, true, 0.25)
    expect(s.holding).toBe(true)
    s = stepBreath(s, true, 0.25)
    expect(s.holding).toBe(false)
    expect(s.locked).toBe(true)
    s = stepBreath(s, true, 0.25)
    expect(s.holding).toBe(false)
    s = stepBreath(s, false, 0.25)
    expect(s.locked).toBe(false)
    s = stepBreath(s, true, 0.25)
    expect(s.holding).toBe(true)
  })
})

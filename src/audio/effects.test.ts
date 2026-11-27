import { describe, expect, it } from 'vitest'
import { EFFECTS, pickEffectFile } from './effects'

describe('pickEffectFile', () => {
  it('chooses a loaded file when present', () => {
    const loaded = new Set(['knock_2'])
    expect(pickEffectFile('knock', (f) => loaded.has(f), () => 0)).toBe('knock_2')
  })
  it('picks among loaded files by the random value', () => {
    const all = () => true
    expect(pickEffectFile('click', all, () => 0)).toBe('creature_click_2')
    expect(pickEffectFile('click', all, () => 0.99)).toBe('creature_click_3')
  })
  it('returns null so the synth fallback is used when nothing is loaded', () => {
    expect(pickEffectFile('knock', () => false)).toBeNull()
    expect(pickEffectFile('hatchSlam', () => false)).toBeNull()
  })
  it('has the gains from the brief', () => {
    expect(EFFECTS.grab.gain).toBe(0.35)
    expect(EFFECTS.creak.gain).toBe(0.8)
    expect(EFFECTS.groan.gain).toBe(0.9)
  })
})

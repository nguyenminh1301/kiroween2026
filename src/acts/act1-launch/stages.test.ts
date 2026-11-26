import { describe, expect, it } from 'vitest'
import { createStages } from './stages'

describe('stage machine', () => {
  it('runs launch, keyin, tli, done in order', () => {
    const s = createStages()
    const seen = [s.stage()]
    s.launchDone()
    seen.push(s.stage())
    s.press()
    s.press()
    expect(s.stage()).toBe('keyin')
    s.press()
    seen.push(s.stage())
    s.tliDone()
    seen.push(s.stage())
    expect(seen).toEqual(['launch', 'keyin', 'tli', 'done'])
  })

  it('ignores presses before the launch ends', () => {
    const s = createStages()
    expect(s.press()).toBe(0)
    expect(s.presses()).toBe(0)
  })

  it('ignores stage ends called out of order', () => {
    const s = createStages()
    expect(s.tliDone()).toBe(false)
    expect(s.launchDone()).toBe(true)
    expect(s.launchDone()).toBe(false)
    expect(s.stage()).toBe('keyin')
  })
})

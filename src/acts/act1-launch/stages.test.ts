import { describe, expect, it } from 'vitest'
import { createStages } from './stages'

describe('stage machine', () => {
  it('runs launch, switch, keyin, tli, done in order', () => {
    const s = createStages()
    const seen = [s.stage()]
    s.launchDone()
    seen.push(s.stage())
    s.flip()
    seen.push(s.stage())
    s.press()
    s.press()
    expect(s.stage()).toBe('keyin')
    s.press()
    seen.push(s.stage())
    s.tliDone()
    seen.push(s.stage())
    expect(seen).toEqual(['launch', 'switch', 'keyin', 'tli', 'done'])
  })

  it('flips the switch only once and only at its stage', () => {
    const s = createStages()
    expect(s.flip()).toBe(false)
    s.launchDone()
    expect(s.flip()).toBe(true)
    expect(s.flip()).toBe(false)
    expect(s.dsky().lamps.keyRel).toBe(true)
  })

  it('ignores stage ends called out of order', () => {
    const s = createStages()
    expect(s.tliDone()).toBe(false)
    expect(s.launchDone()).toBe(true)
    expect(s.launchDone()).toBe(false)
    expect(s.stage()).toBe('switch')
  })
})

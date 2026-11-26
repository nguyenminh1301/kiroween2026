import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createPauseCollector, needsLockPrompt, nextPaused, shouldHoldLock, type LockInputs } from './pointerLock'

const RUNS = { numRuns: 200 }

const lockInputs: fc.Arbitrary<LockInputs> = fc.record({
  lockLost: fc.boolean(),
  wasHeld: fc.boolean(),
  escapePressed: fc.boolean(),
  tabHidden: fc.boolean(),
  debug: fc.boolean(),
})

describe('pointer lock pause', () => {
  // Feature: engine-core, Property 10: Pause-trigger decision
  it('pauses on tab hidden, escape, or held lock loss, otherwise keeps current', () => {
    fc.assert(
      fc.property(fc.boolean(), lockInputs, (current, i) => {
        const r = nextPaused(current, i)
        if (i.tabHidden || i.escapePressed) expect(r).toBe(true)
        else if (i.lockLost && i.wasHeld) expect(r).toBe(true)
        else expect(r).toBe(current)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 11: Escape dedup
  it('pauses exactly once for lock loss and Escape from one press, in any order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('lock', 'key'), { minLength: 1, maxLength: 6 }).filter(
          (evs) => evs.includes('lock') && evs.includes('key'),
        ),
        fc.boolean(),
        (events, debug) => {
          const c = createPauseCollector()
          c.note({ wasHeld: true, debug })
          for (const e of events) {
            c.note(e === 'lock' ? { lockLost: true } : { escapePressed: true })
          }
          const states: boolean[] = [false]
          states.push(c.decide(states[states.length - 1]))
          states.push(c.decide(states[states.length - 1]))
          expect(states).toEqual([false, true, true])
        },
      ),
      RUNS,
    )
  })
})

describe('shouldHoldLock', () => {
  it('holds the lock only while playing and not paused', () => {
    expect(shouldHoldLock('game', false)).toBe(true)
    expect(shouldHoldLock('game', true)).toBe(false)
    for (const s of ['title', 'chapters', 'settings', 'credits', 'archive', 'warning', 'headphones', 'gate'] as const) {
      expect(shouldHoldLock(s, false)).toBe(false)
    }
  })
})

describe('lock through chapter cards', () => {
  it('keeps the lock while a chapter card holds the game paused', () => {
    expect(shouldHoldLock('game', true, true)).toBe(true)
    expect(shouldHoldLock('game', true, false)).toBe(false)
    expect(shouldHoldLock('title', true, true)).toBe(false)
  })
  it('lets go of the lock while the act 3 choice shows', () => {
    expect(shouldHoldLock('game', false, false, true)).toBe(false)
    expect(shouldHoldLock('game', false, false, false)).toBe(true)
  })

  it('prompts only in game, unpaused, with no card and no lock', () => {
    const base = { screen: 'game', paused: false, card: false, locked: false, everLocked: true, debug: true }
    expect(needsLockPrompt(base)).toBe(true)
    expect(needsLockPrompt({ ...base, locked: true })).toBe(false)
    expect(needsLockPrompt({ ...base, paused: true })).toBe(false)
    expect(needsLockPrompt({ ...base, card: true })).toBe(false)
    expect(needsLockPrompt({ ...base, choice: true })).toBe(false)
    expect(needsLockPrompt({ ...base, screen: 'title' })).toBe(false)
    expect(needsLockPrompt({ ...base, everLocked: false })).toBe(false)
    expect(needsLockPrompt({ ...base, everLocked: false, debug: false })).toBe(true)
  })
})

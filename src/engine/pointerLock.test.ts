import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createPauseCollector, nextPaused, type LockInputs } from './pointerLock'

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

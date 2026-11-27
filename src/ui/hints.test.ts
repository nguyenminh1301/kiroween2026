import { describe, expect, it } from 'vitest'
import { HINTS } from '../content/hints'
import type { Hint } from '../engine/fx'
import { createHints } from './hints'

function make(keys?: string) {
  let current: Hint | null = null
  const timers: (() => void)[] = []
  const h = createHints({
    defs: HINTS,
    objectiveKeys: () => keys,
    setHint: (x) => (current = x),
    getHint: () => current,
    schedule: (fn) => void timers.push(fn),
  })
  return { h, get: () => current, timers }
}

describe('hints', () => {
  it('shows once per id and hides after the timer', () => {
    const t = make()
    expect(t.h.showHint('use')).toBe(true)
    expect(t.get()?.text).toBe(HINTS.use.text)
    t.timers[0]()
    expect(t.get()).toBeNull()
    expect(t.h.showHint('use')).toBe(false)
    expect(t.get()).toBeNull()
  })

  it('is not shown when the objective names the same key', () => {
    const t = make('E')
    expect(t.h.showHint('use')).toBe(false)
    expect(t.get()).toBeNull()
    expect(t.h.showHint('breath')).toBe(true)
  })

  it('ignores unknown ids', () => {
    expect(make().h.showHint('nope')).toBe(false)
  })

  it('shows an always hint even when the objective names the same key', () => {
    const t = make('E')
    expect(t.h.showHint('use')).toBe(false)
    expect(t.h.showHint('cage')).toBe(true)
    expect(t.get()?.text).toMatch(/cage door/)
  })
})

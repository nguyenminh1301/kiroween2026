import { describe, expect, it } from 'vitest'
import { IDLE_HINT_AFTER, idleStep, type IdleContext } from './idleHint'

const ctx = (over: Partial<IdleContext> = {}): IdleContext => ({ active: true, shown: false, input: false, ...over })

describe('idleStep', () => {
  it('shows the hint after the idle time and not before', () => {
    const s = { idle: 0 }
    expect(idleStep(s, IDLE_HINT_AFTER - 1, ctx())).toBeNull()
    expect(idleStep(s, 1, ctx())).toBe('show')
  })
  it('does not show it again while it is up', () => {
    const s = { idle: IDLE_HINT_AFTER }
    expect(idleStep(s, 1, ctx({ shown: true }))).toBeNull()
  })
  it('clears it and restarts the timer on input', () => {
    const s = { idle: 30 }
    expect(idleStep(s, 0.016, ctx({ shown: true, input: true }))).toBe('clear')
    expect(s.idle).toBe(0)
  })
  it('does not count while paused or without an objective', () => {
    const s = { idle: 0 }
    idleStep(s, 100, ctx({ active: false }))
    expect(s.idle).toBe(0)
  })
})

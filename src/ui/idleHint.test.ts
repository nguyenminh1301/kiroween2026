import { describe, expect, it } from 'vitest'
import { IDLE_HINT_AFTER, OBJECTIVE_STALE_AFTER, idleStep, type IdleContext } from './idleHint'

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

  it('waits until the objective has been the same for 45 s', () => {
    const s = { idle: 0, objectiveText: 'Wave', objectiveAge: 0 }
    const c = ctx({ objectiveText: 'Wave' })
    expect(idleStep(s, OBJECTIVE_STALE_AFTER - 1, c)).toBeNull()
    expect(idleStep(s, 1, c)).toBe('show')
  })
  it('restarts the objective age when the objective changes', () => {
    const s = { idle: 0 }
    idleStep(s, OBJECTIVE_STALE_AFTER, ctx({ objectiveText: 'Wave' }))
    expect(idleStep(s, 1, ctx({ objectiveText: 'Board' }))).toBeNull()
    expect(idleStep(s, OBJECTIVE_STALE_AFTER - 2, ctx({ objectiveText: 'Board' }))).toBeNull()
    expect(idleStep(s, 2, ctx({ objectiveText: 'Board' }))).toBe('show')
  })
  it('never shows while a line is playing, and clears when one starts', () => {
    const s = { idle: 100, objectiveAge: 100, objectiveText: 'Wave' }
    expect(idleStep(s, 1, ctx({ objectiveText: 'Wave', linePlaying: true }))).toBeNull()
    expect(idleStep(s, 1, ctx({ objectiveText: 'Wave', linePlaying: true, shown: true }))).toBe('clear')
    expect(idleStep(s, 1, ctx({ objectiveText: 'Wave' }))).toBe('show')
  })
})

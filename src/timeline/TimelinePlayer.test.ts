import { afterEach, describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { TimelinePlayer } from './TimelinePlayer'
import type { TimelineDef } from './timeline'
import { frameDriver } from '../engine/frameDriver'
import { cleanupRegistry } from '../engine/cleanupRegistry'
import { gameStore } from '../engine/store'

const RUNS = { numRuns: 100 }
const Q = 1 / 64 // binary-exact quantum so float sums are exact

const quanta = (max: number) => fc.integer({ min: 0, max }).map((n) => n * Q)
const stepsArb = fc.array(quanta(3), { maxLength: 60 }) // dt up to 3/64 < 0.05 clamp

function makeDef(ats: number[], log: number[], extra: Partial<TimelineDef> = {}): TimelineDef {
  return {
    duration: 1,
    events: ats.map((at, i) => ({ at, run: () => void log.push(i) })),
    ...extra,
  }
}

const atsArb = fc.array(fc.integer({ min: 0, max: 64 }).map((n) => n * Q), { maxLength: 12 })

function expectedOrder(ats: number[], upTo: number): number[] {
  return ats
    .map((at, i) => ({ at, i }))
    .filter((e) => e.at <= upTo)
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((e) => e.i)
}

describe('TimelinePlayer events', () => {
  // Feature: engine-core, Property 32: Timeline events fire exactly once, in order, regardless of step chunking
  // **Validates: Requirements 13.3, 13.4, 13.5, 13.12, 13.13**
  it('fires each reached event once in (at, index) order, whatever the chunking', () => {
    fc.assert(
      fc.property(atsArb, stepsArb, fc.integer({ min: 1, max: 5 }), (ats, steps, parts) => {
        const total = Math.min(steps.reduce((a, b) => a + b, 0), 1)
        const logA: number[] = []
        const a = new TimelinePlayer(makeDef(ats, logA))
        for (const s of steps) a.step(s)
        // Same total, re-chunked: merge consecutive groups of `parts` steps.
        const logB: number[] = []
        const b = new TimelinePlayer(makeDef(ats, logB))
        for (let i = 0; i < steps.length; i += parts) b.step(steps.slice(i, i + parts).reduce((x, y) => x + y, 0))
        // With no step at all nothing runs; an event at 0 fires on the first step.
        const expected = steps.length === 0 ? [] : expectedOrder(ats, total)
        expect(logA).toEqual(expected)
        expect(logB).toEqual(expected)
        expect(logA.length).toBeLessThanOrEqual(ats.length)
      }),
      RUNS,
    )
  })

  it('runs ties in listed order and everything due in one big step in time order', () => {
    const log: number[] = []
    const p = new TimelinePlayer(makeDef([0.5, 0.25, 0.5, 0.25, 0.75], log))
    p.step(0.2)
    expect(log).toEqual([])
    p.step(10) // far larger than any frame dt; clamps to duration
    expect(log).toEqual([1, 3, 0, 2, 4])
    expect(p.finished).toBe(true)
  })

  it('fires an event at exactly t = at, and one at duration when finishing', () => {
    const log: number[] = []
    const p = new TimelinePlayer(makeDef([0.5, 1], log))
    p.step(0.25)
    expect(log).toEqual([])
    p.step(0.25)
    expect(log).toEqual([0])
    p.step(0.5)
    expect(log).toEqual([0, 1])
    expect(p.finished).toBe(true)
    p.step(1)
    expect(log).toEqual([0, 1])
  })

  it('ignores non-finite and negative dt', () => {
    const p = new TimelinePlayer(makeDef([], []))
    p.step(-1)
    p.step(Number.NaN)
    expect(p.time()).toBe(0)
  })
})

describe('TimelinePlayer onTick', () => {
  // Feature: engine-core, Property 33: onTick called once per step
  // **Validates: Requirements 13.6**
  it('calls onTick exactly once per step with the running time until finished', () => {
    fc.assert(
      fc.property(stepsArb, fc.integer({ min: 1, max: 64 }), (steps, durQ) => {
        const duration = durQ * Q
        const ticks: number[] = []
        const p = new TimelinePlayer({ duration, onTick: (t) => void ticks.push(t) })
        let t = 0
        const expected: number[] = []
        for (const s of steps) {
          if (p.finished) {
            p.step(s)
            continue
          }
          p.step(s)
          t = Math.min(t + s, duration)
          expected.push(t)
        }
        expect(ticks).toEqual(expected)
        expect(p.time()).toBe(t)
      }),
      RUNS,
    )
  })
})

describe('TimelinePlayer skip', () => {
  // Feature: engine-core, Property 34: Skip semantics
  // **Validates: Requirements 13.9, 13.10, 13.11, 13.13**
  it('fires the remaining events once on skip and never again', () => {
    fc.assert(
      fc.property(atsArb, stepsArb, fc.integer({ min: 0, max: 3 }), (ats, steps, extraSkips) => {
        const log: number[] = []
        const p = new TimelinePlayer(makeDef(ats, log))
        for (const s of steps) p.step(s)
        const before = log.length
        p.skip()
        // Every event ran exactly once, and the tail is the not-yet-fired part in order.
        expect([...log].sort((a, b) => a - b)).toEqual(ats.map((_, i) => i))
        const all = expectedOrder(ats, Infinity)
        expect(log.slice(before)).toEqual(all.slice(before))
        expect(p.finished).toBe(true)
        const after = log.length
        for (let i = 0; i < extraSkips; i++) p.skip()
        p.step(1)
        expect(log.length).toBe(after)
      }),
      RUNS,
    )
  })

  it('skip before any step runs everything in order; second skip and skip after finish run nothing', () => {
    const log: number[] = []
    const p = new TimelinePlayer(makeDef([0.9, 0.1, 0.9], log))
    p.skip()
    expect(log).toEqual([1, 0, 2])
    p.skip()
    expect(log).toEqual([1, 0, 2])

    const log2: number[] = []
    const q = new TimelinePlayer(makeDef([0.5], log2))
    q.step(2)
    expect(log2).toEqual([0])
    q.skip()
    expect(log2).toEqual([0])
  })

  it('reports no camera override and zero shake once finished', () => {
    const p = new TimelinePlayer(
      {
        duration: 1,
        shots: [{ from: 0, to: 1, cam: () => ({ position: { x: 1, y: 1, z: 1 }, lookAt: { x: 0, y: 0, z: 0 } }) }],
        shake: [{ t: 0, amp: 0.5 }],
      },
      { reducedMotion: () => false },
    )
    expect(p.camera()).not.toBeNull()
    expect(p.shake()).toBe(0.5)
    p.skip()
    expect(p.camera()).toBeNull()
    expect(p.shake()).toBe(0)
  })
})

describe('TimelinePlayer pause', () => {
  afterEach(() => {
    gameStore.getState().setPaused(false)
    cleanupRegistry.runAll()
  })

  // Feature: engine-core, Property 35: Timeline time does not advance while paused
  // **Validates: Requirements 13.14**
  it('only accumulates dt from frames that ran unpaused', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(quanta(3), fc.boolean()), { maxLength: 60 }), (frames) => {
        gameStore.getState().setPaused(false)
        const p = new TimelinePlayer({ duration: 100 }).start()
        let expected = 0
        for (const [dt, paused] of frames) {
          gameStore.getState().setPaused(paused)
          frameDriver.step(dt)
          if (!paused) expected += dt
        }
        expect(p.time()).toBe(expected)
        p.stop()
        gameStore.getState().setPaused(false)
      }),
      RUNS,
    )
  })

  it('unregisters its system when it finishes', () => {
    const base = frameDriver.systemCount()
    const p = new TimelinePlayer({ duration: 0.1 }).start()
    expect(frameDriver.systemCount()).toBe(base + 1)
    frameDriver.step(0.05)
    frameDriver.step(0.05)
    expect(p.finished).toBe(true)
    expect(frameDriver.systemCount()).toBe(base)
  })
})

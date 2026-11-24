import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { getSandboxInfo } from '../../engine/debugInfo'
import { frameDriver } from '../../engine/frameDriver'
import { gameStore } from '../../engine/store'
import { startSandbox } from './runtime'
import { TEST_TIMELINE_DURATION } from './testTimeline'

const g = globalThis as unknown as { window?: unknown }
let win: EventTarget

function pressT(repeat = false): void {
  const ev = new Event('keydown') as Event & { code: string; repeat: boolean }
  ev.code = 'KeyT'
  ev.repeat = repeat
  win.dispatchEvent(ev)
}

const time = (): number | null => getSandboxInfo()?.testTimelineTime() ?? null

describe('sandbox test timeline', () => {
  beforeEach(() => {
    win = new EventTarget()
    g.window = win
    gameStore.getState().setPaused(false)
    startSandbox()
  })
  afterEach(() => {
    cleanupRegistry.runAll()
    delete g.window
  })

  it('has no timeline before T and starts one on T', () => {
    expect(time()).toBeNull()
    pressT()
    expect(time()).toBe(0)
  })

  // Feature: engine-core, Property 54: Sandbox test timeline is a singleton
  it('ignores T while the test timeline runs, restarts only after it finished', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant('T' as const), fc.double({ min: 0.01, max: 2, noNaN: true })), { minLength: 1, maxLength: 30 }),
        (ops) => {
          cleanupRegistry.runAll()
          startSandbox()
          let elapsed = 0 // time of the model timeline, null when none
          let started = false
          for (const op of ops) {
            if (op === 'T') {
              const before = time()
              pressT()
              if (!started || elapsed >= TEST_TIMELINE_DURATION) {
                started = true
                elapsed = 0
                expect(time()).toBe(0)
              } else {
                expect(time()).toBe(before)
              }
            } else {
              // Step in clamped chunks, as the driver does.
              let left = op
              while (left > 0) {
                const d = Math.min(left, 0.05)
                frameDriver.step(d)
                left -= d
                if (started) elapsed = Math.min(elapsed + d, TEST_TIMELINE_DURATION)
              }
              if (started) expect(time()).toBeCloseTo(elapsed, 6)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('ignores key repeat and presses while paused', () => {
    pressT(true)
    expect(time()).toBeNull()
    gameStore.getState().setPaused(true)
    pressT()
    expect(time()).toBeNull()
    gameStore.getState().setPaused(false)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import fc from 'fast-check'
import { createCleanupRegistry } from './cleanupRegistry'
import { createFrameDriver } from './frameDriver'
import { addInterval, addListener, addSystem, addTimeout, type ListenerTarget } from './registerHelpers'
import { gameStore } from './store'
import { resetOnUnload } from './unloadReset'
import { createFocusController } from '../interaction/focusRuntime'
import type { MoveMode } from '../types'
import { createBody, type PlayerBody } from './playerBody'
import { TimelinePlayer } from '../timeline/TimelinePlayer'
import { cleanupRegistry as globalRegistry } from './cleanupRegistry'

describe('unload reset', () => {
  afterEach(() => {
    globalRegistry.runAll()
    vi.restoreAllMocks()
  })

  // Feature: engine-core, Property 50: Unload resets Timeline, Focus, and store fields
  it('finishes the Timeline, clears Focus and resets moveMode, objective, target', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.constantFrom<MoveMode>('walk', 'zeroG', 'seated'),
        fc.option(fc.string(), { nil: null }),
        fc.option(fc.string(), { nil: null }),
        (withTimeline, withFocus, mode, objective, target) => {
          const s = gameStore.getState()
          s.setMoveMode(mode)
          s.setObjective(objective)
          s.setTarget(target)

          let timeline: TimelinePlayer | null = null
          if (withTimeline) timeline = new TimelinePlayer({ duration: 5 }).start()

          let body: PlayerBody = createBody()
          const focusCleanups = createCleanupRegistry()
          const driver = createFrameDriver(() => false)
          const ctl = createFocusController({
            registerSystem: driver.register,
            cleanupRegistry: focusCleanups,
            installProvider: () => {},
          })
          ctl.setBodyAccess({ get: () => body, set: (b) => (body = b) })
          if (withFocus) ctl.focusOn({ x: 5, y: 1, z: 5 }, 2, true)
          expect(ctl.isFocusActive()).toBe(withFocus)

          resetOnUnload({ clearFocus: ctl.clearFocus })

          if (timeline) expect(timeline.finished).toBe(true)
          expect(ctl.isFocusActive()).toBe(false)
          expect(driver.systemCount()).toBe(0)
          const after = gameStore.getState()
          expect(after.moveMode).toBe('walk')
          expect(after.objective).toBeNull()
          expect(after.target).toBeNull()
          globalRegistry.runAll()
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: engine-core, Property 51: System count returns to baseline after load/play/unload
  it('returns the system count to the baseline after the registry runs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.record({
          systems: fc.nat(6),
          timeouts: fc.nat(6),
          intervals: fc.nat(6),
          listeners: fc.nat(6),
          frames: fc.nat(5),
        }),
        (baseline, spec) => {
          const driver = createFrameDriver(() => false)
          for (let i = 0; i < baseline; i++) driver.register('base', i, () => {})
          const registry = createCleanupRegistry()
          const deps = { cleanupRegistry: registry, registerSystem: driver.register }
          let attached = 0
          const target: ListenerTarget = {
            addEventListener: () => void attached++,
            removeEventListener: () => void attached--,
          }
          for (let i = 0; i < spec.systems; i++) addSystem('s', i, () => {}, undefined, deps)
          for (let i = 0; i < spec.timeouts; i++) addTimeout(() => {}, 0.1 * i, deps)
          for (let i = 0; i < spec.intervals; i++) addInterval(() => {}, 0.1, deps)
          for (let i = 0; i < spec.listeners; i++) addListener(target, 'x', () => {}, undefined, deps)
          for (let i = 0; i < spec.frames; i++) driver.step(0.05)
          registry.runAll()
          expect(driver.systemCount()).toBe(baseline)
          expect(attached).toBe(0)
        },
      ),
      { numRuns: 100 },
    )
  })
})

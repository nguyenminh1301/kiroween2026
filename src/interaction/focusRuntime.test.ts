import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createCleanupRegistry } from '../engine/cleanupRegistry'
import { createFrameDriver } from '../engine/frameDriver'
import { createBody, type PlayerBody } from '../engine/playerBody'
import { createFocusController, FOCUS_PRIORITY } from './focusRuntime'

function setup() {
  let paused = false
  const driver = createFrameDriver(() => paused)
  const cleanups = createCleanupRegistry()
  const provider: { fn: (() => boolean) | null } = { fn: null }
  let body: PlayerBody = createBody({ yaw: 0, pitch: 0 })
  const controller = createFocusController({
    registerSystem: driver.register,
    cleanupRegistry: cleanups,
    installProvider: (fn) => {
      provider.fn = fn
    },
  })
  controller.setBodyAccess({
    get: () => body,
    set: (b) => {
      body = b
    },
  })
  return {
    driver,
    controller,
    cleanups,
    provider,
    getBody: () => body,
    setPaused: (p: boolean) => {
      paused = p
    },
  }
}

describe('focus runtime', () => {
  it('a scripted look never lasts longer than 1.5 s, whatever it asks for', () => {
    const t = setup()
    t.controller.focusOn({ x: 0, y: 1.65, z: 10 }, 4)
    for (let i = 0; i < 29; i++) t.driver.step(0.05)
    expect(t.controller.isFocusActive()).toBe(true)
    for (let i = 0; i < 2; i++) t.driver.step(0.05)
    expect(t.controller.isFocusActive()).toBe(false)
    expect(t.provider.fn).toBeNull()
  })

  it('the default look also ends within 1.5 s', () => {
    const t = setup()
    t.controller.focusOn({ x: 0, y: 1.65, z: 10 })
    for (let i = 0; i < 31; i++) t.driver.step(0.05)
    expect(t.controller.isFocusActive()).toBe(false)
  })

  // Feature: engine-core, Property 44: Focus time does not advance while paused
  // **Validates: Requirements 15.10**
  it('Property 44: only unpaused steps advance the Focus', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            paused: fc.boolean(),
            dt: fc.double({ min: 0.001, max: 0.05, noNaN: true }),
          }),
          { minLength: 1, maxLength: 60 },
        ),
        fc.double({ min: 0.5, max: 4, noNaN: true }),
        fc.double({ min: -3, max: 3, noNaN: true }),
        (steps, seconds, yawTarget) => {
          const t = setup()
          t.controller.focusOn(
            { x: -Math.sin(yawTarget) * 10, y: 1.65, z: -Math.cos(yawTarget) * 10 },
            seconds,
            true,
          )
          // Reference: a twin run that only gets the unpaused steps.
          const ref = setup()
          ref.controller.focusOn(
            { x: -Math.sin(yawTarget) * 10, y: 1.65, z: -Math.cos(yawTarget) * 10 },
            seconds,
            true,
          )
          for (const s of steps) {
            t.setPaused(s.paused)
            const before = t.getBody()
            t.driver.step(s.dt)
            if (s.paused) expect(t.getBody()).toBe(before)
            else ref.driver.step(s.dt)
          }
          expect(t.getBody().yaw).toBeCloseTo(ref.getBody().yaw, 12)
          expect(t.getBody().pitch).toBeCloseTo(ref.getBody().pitch, 12)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('reports active, tells the input layer, and ends after the turn time', () => {
    const t = setup()
    expect(t.controller.isFocusActive()).toBe(false)
    t.controller.focusOn({ x: -10, y: 1.65, z: 0 })
    expect(t.controller.isFocusActive()).toBe(true)
    expect(t.provider.fn?.()).toBe(true)
    expect(t.driver.systemCount()).toBe(1)
    for (let i = 0; i < 45; i++) t.driver.step(0.05)
    expect(t.controller.isFocusActive()).toBe(false)
    expect(t.provider.fn).toBeNull()
    expect(t.driver.systemCount()).toBe(0)
    expect(t.getBody().yaw).toBeCloseTo(Math.PI / 2, 3)
  })

  it('clearFocus and act cleanup both end it and remove the system', () => {
    const t = setup()
    t.controller.focusOn({ x: 0, y: 1.65, z: -5 }, 2, true)
    t.controller.clearFocus()
    expect(t.controller.isFocusActive()).toBe(false)
    expect(t.driver.systemCount()).toBe(0)
    t.controller.focusOn({ x: 0, y: 1.65, z: -5 }, 2, true)
    t.cleanups.runAll()
    expect(t.controller.isFocusActive()).toBe(false)
    expect(t.driver.systemCount()).toBe(0)
  })

  it('a second focusOn replaces the first with one system', () => {
    const t = setup()
    t.controller.focusOn({ x: -10, y: 1.65, z: 0 })
    t.driver.step(0.05)
    t.controller.focusOn({ x: 10, y: 1.65, z: 0 })
    expect(t.driver.systemCount()).toBe(1)
    expect(FOCUS_PRIORITY).toBe(200)
  })

  it('focusOn does nothing without a body', () => {
    const t = setup()
    t.controller.setBodyAccess(null)
    t.controller.focusOn({ x: 1, y: 1, z: 1 })
    expect(t.controller.isFocusActive()).toBe(false)
  })
})

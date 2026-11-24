import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Vec3 } from '../types'
import {
  clearFocus,
  directionTo,
  shortestAngle,
  startFocus,
  stepFocus,
  type FocusState,
} from './focus'

const RUNS = { numRuns: 100 }
const TAU = Math.PI * 2

const vec = fc.record({
  x: fc.double({ min: -50, max: 50, noNaN: true }),
  y: fc.double({ min: -50, max: 50, noNaN: true }),
  z: fc.double({ min: -50, max: 50, noNaN: true }),
})
const yawArb = fc.double({ min: -20, max: 20, noNaN: true })
const pitchArb = fc.double({ min: -1.5, max: 1.5, noNaN: true })
const secondsArb = fc.double({ min: 0.1, max: 5, noNaN: true })
const dtArb = fc.double({ min: 0.001, max: 0.05, noNaN: true })

/** Angle difference a - b wrapped to [-PI, PI]. */
function angleDiff(a: number, b: number): number {
  return Math.abs(shortestAngle(a - b))
}

function runToEnd(state: FocusState, eye: Vec3, dt: number) {
  let s = state
  let last = { yaw: s.startYaw, pitch: s.startPitch, active: s.active }
  for (let i = 0; i < 10000 && s.elapsed < s.seconds; i++) {
    const step = stepFocus(s, dt, eye)
    s = step.state
    last = { yaw: step.yaw, pitch: step.pitch, active: step.active }
  }
  return { state: s, ...last }
}

describe('focus properties', () => {
  // Feature: engine-core, Property 40: Focus progression reaches the target within tolerance
  // **Validates: Requirements 15.1, 15.2, 15.11**
  it('Property 40: finishes facing the target, re-reading a time-varying target each step', () => {
    fc.assert(
      fc.property(
        yawArb,
        pitchArb,
        secondsArb,
        dtArb,
        vec,
        vec,
        vec,
        (yaw, pitch, seconds, dt, eye, a, b) => {
          fc.pre(Math.hypot(b.x - eye.x, b.y - eye.y, b.z - eye.z) > 1)
          fc.pre(Math.hypot(a.x - eye.x, a.y - eye.y, a.z - eye.z) > 1)
          let calls = 0
          // Target moves from a to b as it is read; the last read value is what counts.
          let current: Vec3 = a
          const targetFn = () => {
            calls++
            current = calls < 3 ? a : b
            return current
          }
          const state = startFocus({ yaw, pitch }, targetFn, seconds)
          const result = runToEnd(state, eye, dt)
          // Re-read on every step, not only at start.
          expect(calls).toBeGreaterThanOrEqual(3)
          const want = directionTo(eye, current)
          expect(angleDiff(result.yaw, want.yaw)).toBeLessThan(0.001)
          expect(Math.abs(result.pitch - want.pitch)).toBeLessThan(0.001)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 41: Focus hold/clear semantics
  // **Validates: Requirements 15.4, 15.5, 15.6**
  it('Property 41: hold keeps the Focus active and tracking until cleared', () => {
    fc.assert(
      fc.property(
        yawArb,
        pitchArb,
        secondsArb,
        dtArb,
        fc.boolean(),
        vec,
        vec,
        fc.integer({ min: 1, max: 20 }),
        (yaw, pitch, seconds, dt, hold, eye, target, extra) => {
          fc.pre(Math.hypot(target.x - eye.x, target.y - eye.y, target.z - eye.z) > 1)
          const done = runToEnd(startFocus({ yaw, pitch }, () => target, seconds, hold), eye, dt)
          expect(done.state.elapsed).toBeGreaterThanOrEqual(seconds)
          expect(done.active).toBe(hold)
          let s = done.state
          for (let i = 0; i < extra; i++) {
            const step = stepFocus(s, dt, eye)
            s = step.state
            expect(step.active).toBe(hold)
            if (hold) {
              const want = directionTo(eye, target)
              expect(angleDiff(step.yaw, want.yaw)).toBeLessThan(0.001)
              expect(Math.abs(step.pitch - want.pitch)).toBeLessThan(0.001)
            }
          }
          // Clearing ends it whatever `hold` says.
          const cleared = clearFocus(s)
          expect(cleared.active).toBe(false)
          expect(stepFocus(cleared, dt, eye).active).toBe(false)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 42: Focus replacement starts from current direction
  // **Validates: Requirements 15.7**
  it('Property 42: a replacement Focus starts from the in-progress view', () => {
    fc.assert(
      fc.property(
        yawArb,
        pitchArb,
        secondsArb,
        dtArb,
        fc.integer({ min: 0, max: 30 }),
        vec,
        vec,
        vec,
        (yaw, pitch, seconds, dt, n, eye, t1, t2) => {
          fc.pre(Math.hypot(t1.x - eye.x, t1.y - eye.y, t1.z - eye.z) > 1)
          let s = startFocus({ yaw, pitch }, () => t1, seconds)
          let view = { yaw, pitch }
          for (let i = 0; i < n && s.active; i++) {
            const step = stepFocus(s, dt, eye)
            s = step.state
            view = { yaw: step.yaw, pitch: step.pitch }
          }
          const next = startFocus(view, () => t2, seconds)
          expect(next.startYaw).toBe(view.yaw)
          expect(next.startPitch).toBe(view.pitch)
          expect(next.elapsed).toBe(0)
          fc.pre(Math.hypot(t2.x - eye.x, t2.y - eye.y, t2.z - eye.z) > 1)
          // A tiny first step stays near the in-progress view, not the original start.
          const first = stepFocus(next, 1e-9, eye)
          expect(angleDiff(first.yaw, view.yaw)).toBeLessThan(1e-6)
          expect(Math.abs(first.pitch - view.pitch)).toBeLessThan(1e-6)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 43: Shortest-path yaw turning
  // **Validates: Requirements 15.9**
  it('Property 43: yaw turns by at most 180 degrees', () => {
    fc.assert(
      fc.property(
        yawArb,
        fc.double({ min: -200, max: 200, noNaN: true }),
        (startYaw, delta) => {
          expect(Math.abs(shortestAngle(delta))).toBeLessThanOrEqual(Math.PI + 1e-9)
          // Same direction as the raw delta modulo a full turn.
          const k = (delta - shortestAngle(delta)) / TAU
          expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6)
          // End to end: total yaw travel through a Focus never exceeds PI.
          const eye = { x: 0, y: 0, z: 0 }
          const target = { x: -Math.sin(startYaw + delta) * 5, y: 0, z: -Math.cos(startYaw + delta) * 5 }
          let s = startFocus({ yaw: startYaw, pitch: 0 }, () => target, 1)
          let prev = startYaw
          for (let i = 0; i < 25; i++) {
            const step = stepFocus(s, 0.05, eye)
            s = step.state
            expect(Math.abs(step.yaw - startYaw)).toBeLessThanOrEqual(Math.PI + 1e-6)
            // Monotone: never reverses.
            expect(Math.sign(step.yaw - prev) * Math.sign(step.yaw - startYaw)).toBeGreaterThanOrEqual(0)
            prev = step.yaw
          }
        },
      ),
      RUNS,
    )
  })

  it('unit: a 350 degree request turns 10 degrees the short way', () => {
    const d = shortestAngle((350 * Math.PI) / 180)
    expect(d).toBeCloseTo((-10 * Math.PI) / 180, 9)
  })
})

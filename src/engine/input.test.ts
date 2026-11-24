import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  ACTIONS,
  KEY_MAP,
  accumulateMouse,
  applyKeyDown,
  applyKeyUp,
  applyMouseDown,
  applyMouseLook,
  applyMouseLookUnlessFocused,
  applyMouseUp,
  clearAllHeld,
  createInputState,
  endFrame,
  filterMouseEvent,
  isWithinLockGuard,
  type Action,
} from './input'

const RUNS = { numRuns: 200 }
const mappedCodes = Object.keys(KEY_MAP)
const mappedCode = fc.constantFrom(...mappedCodes)
const unmappedCode = fc
  .string({ maxLength: 12 })
  .filter((c) => !Object.prototype.hasOwnProperty.call(KEY_MAP, c))
const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true })

type KeyOp =
  | { t: 'down'; code: string }
  | { t: 'up'; code: string }
  | { t: 'blur' }
  | { t: 'end' }
  | { t: 'unknown'; code: string }

const keyOp: fc.Arbitrary<KeyOp> = fc.oneof(
  mappedCode.map((code): KeyOp => ({ t: 'down', code })),
  mappedCode.map((code): KeyOp => ({ t: 'up', code })),
  fc.constant<KeyOp>({ t: 'blur' }),
  fc.constant<KeyOp>({ t: 'end' }),
  unmappedCode.map((code): KeyOp => ({ t: 'unknown', code })),
)

describe('input state machine', () => {
  // Feature: engine-core, Property 4: Input held/pressed state machine
  it('follows the held/pressed model for any key sequence', () => {
    fc.assert(
      fc.property(fc.array(keyOp, { maxLength: 60 }), (ops) => {
        const s = createInputState()
        const held = new Set<Action>()
        const pressed = new Set<Action>()
        for (const op of ops) {
          if (op.t === 'down') {
            const a = KEY_MAP[op.code]
            const was = held.has(a)
            applyKeyDown(s, op.code)
            if (!was) {
              expect(s.pressed[a]).toBe(true)
              pressed.add(a)
            }
            held.add(a)
          } else if (op.t === 'up') {
            applyKeyUp(s, op.code)
            held.delete(KEY_MAP[op.code])
          } else if (op.t === 'blur') {
            clearAllHeld(s)
            held.clear()
          } else if (op.t === 'end') {
            endFrame(s)
            pressed.clear()
            for (const a of ACTIONS) expect(s.pressed[a]).toBe(false)
          } else {
            const before = JSON.stringify(s)
            applyKeyDown(s, op.code)
            applyKeyUp(s, op.code)
            expect(JSON.stringify(s)).toBe(before)
          }
          for (const a of ACTIONS) {
            expect(s.held[a]).toBe(held.has(a))
            expect(s.pressed[a]).toBe(pressed.has(a))
          }
        }
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 5: Mouse-driven use action
  it('holds use only for a locked mouse-down without a later mouse-up', () => {
    const op = fc.record({ kind: fc.constantFrom('down', 'up'), locked: fc.boolean() })
    fc.assert(
      fc.property(fc.array(op, { maxLength: 50 }), (ops) => {
        const s = createInputState()
        let expected = false
        for (const o of ops) {
          if (o.kind === 'down') {
            const was = s.held.use
            applyMouseDown(s, o.locked)
            if (o.locked) {
              expected = true
              if (!was) expect(s.pressed.use).toBe(true)
            }
          } else {
            applyMouseUp(s)
            expected = false
          }
          expect(s.held.use).toBe(expected)
          endFrame(s)
        }
      }),
      RUNS,
    )
  })
})

describe('mouse look', () => {
  // Feature: engine-core, Property 6: Mouse look formula and accepted-event filter
  it('applies the formula and filters events over 400', () => {
    fc.assert(
      fc.property(
        finite(-10, 10),
        finite(-10, 10),
        finite(-400, 400),
        finite(-400, 400),
        finite(0.1, 5),
        (yaw, pitch, mx, my, sens) => {
          const r = applyMouseLook({ yaw, pitch }, mx, my, sens)
          expect(r.yaw).toBeCloseTo(yaw - mx * 0.002 * sens, 9)
          expect(r.pitch).toBeCloseTo(pitch - my * 0.002 * sens, 9)
          expect(filterMouseEvent(mx, my)).toBe(true)
        },
      ),
      RUNS,
    )
    expect(filterMouseEvent(400, -400)).toBe(true)
    fc.assert(
      fc.property(
        fc.double({ min: 400.001, max: 5000, noNaN: true }),
        fc.boolean(),
        finite(-400, 400),
        (big, neg, small) => {
          const v = neg ? -big : big
          expect(filterMouseEvent(v, small)).toBe(false)
          expect(filterMouseEvent(small, v)).toBe(false)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 7: Lock guard window
  it('is within the guard iff elapsed < 150 ms', () => {
    fc.assert(
      fc.property(finite(0, 1e6), finite(0, 1000), (t, dt) => {
        expect(isWithinLockGuard(t, t + dt)).toBe(t + dt - t < 150)
      }),
      RUNS,
    )
    expect(isWithinLockGuard(1000, 1149.9)).toBe(true)
    expect(isWithinLockGuard(1000, 1150)).toBe(false)
  })

  // Feature: engine-core, Property 8: Focus suppresses mouse look
  it('leaves yaw and pitch unchanged while a focus is active', () => {
    fc.assert(
      fc.property(
        finite(-10, 10),
        finite(-10, 10),
        finite(-400, 400),
        finite(-400, 400),
        finite(0.1, 5),
        (yaw, pitch, mx, my, sens) => {
          const s = { yaw, pitch }
          const r = applyMouseLookUnlessFocused(s, mx, my, sens, true)
          expect(r).toEqual({ yaw, pitch })
          const acc = { x: 0, y: 0 }
          const ok = accumulateMouse(acc, mx, my, {
            locked: true,
            focusActive: true,
            lockChangeAtMs: null,
            nowMs: 5000,
          })
          expect(ok).toBe(false)
          expect(acc).toEqual({ x: 0, y: 0 })
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 9: Confluence of split mouse movement
  it('gives the same result for split and summed movement', () => {
    fc.assert(
      fc.property(
        finite(-10, 10),
        finite(-10, 10),
        finite(-400, 400),
        finite(-400, 400),
        finite(-400, 400),
        finite(-400, 400),
        finite(0.1, 5),
        (yaw, pitch, ax, ay, bx, by, sens) => {
          const split = applyMouseLook(applyMouseLook({ yaw, pitch }, ax, ay, sens), bx, by, sens)
          const whole = applyMouseLook({ yaw, pitch }, ax + bx, ay + by, sens)
          expect(split.yaw).toBeCloseTo(whole.yaw, 6)
          expect(split.pitch).toBeCloseTo(whole.pitch, 6)
        },
      ),
      RUNS,
    )
  })
})

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { HANDRAIL_REACH, isHandrailUsable } from './handrail'
import type { Vec3 } from '../types'

const RUNS = { numRuns: 200 }

const coord = fc.integer({ min: -1000, max: 1000 })
const eyeArb: fc.Arbitrary<Vec3> = fc.record({ x: coord, y: coord, z: coord })
const unit: fc.Arbitrary<Vec3> = fc
  .record({
    x: fc.double({ min: -1, max: 1, noNaN: true }),
    y: fc.double({ min: -1, max: 1, noNaN: true }),
    z: fc.double({ min: -1, max: 1, noNaN: true }),
  })
  .filter((v) => Math.hypot(v.x, v.y, v.z) > 1e-3)
  .map((v) => {
    const l = Math.hypot(v.x, v.y, v.z)
    return { x: v.x / l, y: v.y / l, z: v.z / l }
  })

describe('handrail usability', () => {
  it('reach is 2.0 m', () => {
    expect(HANDRAIL_REACH).toBe(2)
  })

  // Feature: engine-core, Property 26: Handrail usability boundary
  // **Validates: Requirements 10.8, 10.9**
  it('Property 26: usable inside 2.0 m, unusable beyond, in any direction', () => {
    fc.assert(
      fc.property(
        eyeArb,
        unit,
        fc.double({ min: 0, max: 1.999, noNaN: true }),
        fc.double({ min: 2.001, max: 50, noNaN: true }),
        (eye, dir, near, far) => {
          const at = (d: number): Vec3 => ({ x: eye.x + dir.x * d, y: eye.y + dir.y * d, z: eye.z + dir.z * d })
          expect(isHandrailUsable(eye, at(near))).toBe(true)
          expect(isHandrailUsable(eye, at(far))).toBe(false)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 26: Handrail usability boundary
  it('Property 26: exactly 2.0 m is usable (inclusive)', () => {
    fc.assert(
      fc.property(eyeArb, fc.constantFrom<'x' | 'y' | 'z'>('x', 'y', 'z'), fc.constantFrom(-1, 1), (eye, axis, sign) => {
        const rail = { ...eye, [axis]: eye[axis] + sign * 2 }
        expect(isHandrailUsable(eye, rail)).toBe(true)
        expect(isHandrailUsable(rail, eye)).toBe(true)
      }),
      RUNS,
    )
  })
})

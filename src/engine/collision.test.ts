import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { CAPSULE_HEIGHT, CAPSULE_RADIUS, resolveCapsule, type Box } from './collision'
import type { Vec3 } from '../types'

const RUNS = { numRuns: 200 }
const TOL = 1e-6

const num = (min: number, max: number) => fc.double({ min, max, noNaN: true, noDefaultInfinity: true })
const vec = (lim: number): fc.Arbitrary<Vec3> =>
  fc.record({ x: num(-lim, lim), y: num(-lim, lim), z: num(-lim, lim) })

/** True overlap by more than TOL on every axis (capsule treated as its bounding box). */
function overlaps(pos: Vec3, b: Box): boolean {
  const r = CAPSULE_RADIUS
  return (
    pos.x + r > b.min.x + TOL &&
    pos.x - r < b.max.x - TOL &&
    pos.z + r > b.min.z + TOL &&
    pos.z - r < b.max.z - TOL &&
    pos.y + CAPSULE_HEIGHT > b.min.y + TOL &&
    pos.y < b.max.y - TOL
  )
}

/**
 * Boxes that leave room: each sits in its own 6 m wide x-cell with at least
 * 0.8 m of margin on both sides, so gaps between boxes are at least 1.6 m.
 */
const roomyBoxes: fc.Arbitrary<Box[]> = fc
  .array(
    fc.record({
      x0: num(0.8, 2),
      w: num(0.2, 2.4),
      y0: num(-3, 3),
      h: num(0.2, 4),
      z0: num(-3, 3),
      d: num(0.2, 4),
    }),
    { minLength: 1, maxLength: 6 },
  )
  .map((specs) =>
    specs.map((s, i) => ({
      min: { x: i * 6 + s.x0, y: s.y0, z: s.z0 },
      max: { x: i * 6 + s.x0 + s.w, y: s.y0 + s.h, z: s.z0 + s.d },
    })),
  )

const positionNear = fc.record({ x: num(-2, 38), y: num(-6, 8), z: num(-6, 8) })

describe('collision', () => {
  // Feature: engine-core, Property 28: Collision resolution has no final overlap, is a no-op when already separated, and is idempotent
  it('leaves no overlap with room-leaving boxes', () => {
    fc.assert(
      fc.property(roomyBoxes, positionNear, vec(5), (boxes, pos, vel) => {
        const r = resolveCapsule(pos, vel, boxes)
        for (const b of boxes) expect(overlaps(r.pos, b)).toBe(false)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 28: Collision resolution has no final overlap, is a no-op when already separated, and is idempotent
  it('returns a non-overlapping capsule unchanged', () => {
    fc.assert(
      fc.property(roomyBoxes, positionNear, vec(5), (boxes, pos, vel) => {
        fc.pre(boxes.every((b) => !overlaps(pos, b)))
        const r = resolveCapsule(pos, vel, boxes)
        expect(r.pos).toEqual(pos)
        expect(r.vel).toEqual(vel)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 28: Collision resolution has no final overlap, is a no-op when already separated, and is idempotent
  it('is idempotent', () => {
    fc.assert(
      fc.property(roomyBoxes, positionNear, vec(5), (boxes, pos, vel) => {
        const first = resolveCapsule(pos, vel, boxes)
        const second = resolveCapsule(first.pos, first.vel, boxes)
        expect(second.pos).toEqual(first.pos)
        expect(second.vel).toEqual(first.vel)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 29: Sliding along a wall
  it('keeps the along-wall velocity and removes the into-wall component', () => {
    const side = fc.constantFrom(-1, 1)
    fc.assert(
      fc.property(
        side,
        fc.constantFrom<'x' | 'z'>('x', 'z'),
        num(0.001, 0.1),
        num(0.1, 5),
        num(-5, 5),
        num(-5, 5),
        (s, axis, depth, into, along, vertical) => {
          const other = axis === 'x' ? 'z' : 'x'
          // Wall slab 1 m thick on the chosen axis, huge on the other two.
          const lo = s > 0 ? 1 : -2
          const wall: Box = {
            min: { x: -50, y: -50, z: -50, [axis]: lo } as unknown as Vec3,
            max: { x: 50, y: 50, z: 50, [axis]: lo + 1 } as unknown as Vec3,
          }
          // Capsule edge pokes `depth` into the wall face it faces.
          const face = s > 0 ? 1 : -1
          const pos = { x: 0, y: 0, z: 0 } as Vec3
          pos[axis] = face - s * CAPSULE_RADIUS + s * depth
          // Velocity points into the wall: toward +axis for s > 0 wall at +side.
          const vel = { x: 0, y: vertical, z: 0 } as Vec3
          vel[axis] = s * into
          vel[other] = along
          const r = resolveCapsule(pos, vel, [wall])
          expect(r.vel[axis]).toBe(0)
          expect(r.vel[other]).toBe(along)
          expect(r.vel.y).toBe(vertical)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 30: Vertical landing and ceiling contact
  it('lands on top of a box: stops falling and reports onGround', () => {
    fc.assert(
      fc.property(
        num(-1, 1),
        num(-1, 1),
        num(0.001, 0.1),
        num(0.1, 20),
        num(-5, 5),
        num(-5, 5),
        (x, z, depth, fall, vx, vz) => {
          const floor: Box = { min: { x: -10, y: -5, z: -10 }, max: { x: 10, y: 0, z: 10 } }
          const r = resolveCapsule({ x, y: -depth, z }, { x: vx, y: -fall, z: vz }, [floor])
          expect(r.vel.y).toBe(0)
          expect(r.onGround).toBe(true)
          expect(Math.abs(r.pos.y)).toBeLessThanOrEqual(1e-9)
          expect(r.vel.x).toBe(vx)
          expect(r.vel.z).toBe(vz)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 30: Vertical landing and ceiling contact
  it('hits the underside of a box while rising: stops rising', () => {
    fc.assert(
      fc.property(
        num(-1, 1),
        num(-1, 1),
        num(0.001, 0.1),
        num(0.1, 20),
        (x, z, depth, rise) => {
          const ceiling: Box = { min: { x: -10, y: 5, z: -10 }, max: { x: 10, y: 10, z: 10 } }
          const pos = { x, y: 5 + depth - CAPSULE_HEIGHT, z }
          const r = resolveCapsule(pos, { x: 0, y: rise, z: 0 }, [ceiling])
          expect(r.vel.y).toBe(0)
          expect(r.onGround).toBe(false)
          expect(r.pos.y + CAPSULE_HEIGHT).toBeLessThanOrEqual(5 + 1e-9)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 31: Collision never throws
  it('never throws and returns finite values for arbitrary boxes', () => {
    const anyBox: fc.Arbitrary<Box> = fc.record({ min: vec(20), max: vec(20) })
    fc.assert(
      fc.property(fc.array(anyBox, { maxLength: 12 }), vec(20), vec(50), (boxes, pos, vel) => {
        const r = resolveCapsule(pos, vel, boxes)
        for (const k of ['x', 'y', 'z'] as const) {
          expect(Number.isFinite(r.pos[k])).toBe(true)
          expect(Number.isFinite(r.vel[k])).toBe(true)
        }
      }),
      RUNS,
    )
  })

  it('returns a start position unchanged when there are no boxes', () => {
    const r = resolveCapsule({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 0 }, [])
    expect(r.pos).toEqual({ x: 1, y: 2, z: 3 })
    expect(r.onGround).toBe(false)
  })
})

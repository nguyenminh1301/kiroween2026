import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { CAPSULE, createBody, eyePosition, setBody, type PlayerBody } from './playerBody'
import type { MoveMode, Vec3 } from '../types'

const RUNS = { numRuns: 200 }

const num = (lim: number) => fc.double({ min: -lim, max: lim, noNaN: true, noDefaultInfinity: true })
const vec: fc.Arbitrary<Vec3> = fc.record({ x: num(1e4), y: num(1e4), z: num(1e4) })
const mode: fc.Arbitrary<MoveMode> = fc.constantFrom<MoveMode>('walk', 'zeroG', 'seated')

const body: fc.Arbitrary<PlayerBody> = fc.record({
  pos: vec,
  vel: vec,
  yaw: num(10),
  pitch: num(10),
  mode,
})

const partial: fc.Arbitrary<Partial<PlayerBody>> = fc.record(
  { pos: vec, vel: vec, yaw: num(10), pitch: num(10), mode },
  { requiredKeys: [] },
)

describe('player body', () => {
  it('has the fixed capsule dimensions', () => {
    expect(CAPSULE.height).toBe(1.8)
    expect(CAPSULE.radius).toBe(0.3)
    expect(CAPSULE.eyeHeight).toBe(1.65)
  })

  // Feature: engine-core, Property 16: Eye position and partial body update
  // **Validates: Requirements 8.4, 8.5, 8.6, 8.7**
  it('Property 16: eye is 1.65 m above the feet', () => {
    fc.assert(
      fc.property(body, (b) => {
        const eye = eyePosition(b)
        expect(eye.x).toBe(b.pos.x)
        expect(eye.z).toBe(b.pos.z)
        expect(eye.y).toBe(b.pos.y + 1.65)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 16: Eye position and partial body update
  it('Property 16: setBody overwrites only given fields and zeroes vel for pos-only updates', () => {
    fc.assert(
      fc.property(body, partial, (b, p) => {
        const before = structuredClone(b)
        const next = setBody(b, p)
        // input not mutated
        expect(b).toEqual(before)
        expect(next.pos).toEqual(p.pos ?? b.pos)
        expect(next.yaw).toBe(p.yaw ?? b.yaw)
        expect(next.pitch).toBe(p.pitch ?? b.pitch)
        expect(next.mode).toBe(p.mode ?? b.mode)
        if (p.vel !== undefined) expect(next.vel).toEqual(p.vel)
        else if (p.pos !== undefined) expect(next.vel).toEqual({ x: 0, y: 0, z: 0 })
        else expect(next.vel).toEqual(b.vel)
      }),
      RUNS,
    )
  })

  it('createBody defaults to a resting walk body', () => {
    expect(createBody()).toEqual({
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      mode: 'walk',
    })
  })
})

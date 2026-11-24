import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  evaluateShot,
  interpolateCamera,
  selectShot,
  shakeAmplitude,
  type CameraKey,
  type CameraPose,
  type Shot,
  type ShakeKey,
} from './timeline'
import type { Vec3 } from '../types'

const RUNS = { numRuns: 100 }

const num = fc.double({ min: -100, max: 100, noNaN: true })
const vec = fc.record({ x: num, y: num, z: num }) as fc.Arbitrary<Vec3>
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
const nearVec = (a: Vec3, b: Vec3) => near(a.x, b.x) && near(a.y, b.y) && near(a.z, b.z)

const keyTimes = fc.uniqueArray(fc.integer({ min: 0, max: 200 }), { minLength: 1, maxLength: 8 })
const camKeys: fc.Arbitrary<CameraKey[]> = keyTimes.chain((ts) =>
  fc
    .array(fc.record({ position: vec, lookAt: vec }), { minLength: ts.length, maxLength: ts.length })
    .map((vs) => ts.map((t, i) => ({ t: t / 4, ...vs[i] })).sort((a, b) => a.t - b.t)),
)

const pose: CameraPose = { position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 1 } }
const mkShot = (from: number, to: number, extra: Partial<Shot> = {}): Shot => ({ from, to, cam: () => pose, ...extra })

describe('interpolateCamera', () => {
  // Feature: engine-core, Property 36: Camera key interpolation
  // **Validates: Requirements 13.7, 13.8**
  it('lerps between bounding keys and holds the nearest key outside the range', () => {
    fc.assert(
      fc.property(camKeys, fc.double({ min: -10, max: 60, noNaN: true }), (keys, t) => {
        const got = interpolateCamera(keys, t)!
        const first = keys[0]
        const last = keys[keys.length - 1]
        if (t <= first.t) {
          expect(nearVec(got.position, first.position)).toBe(true)
          expect(nearVec(got.lookAt, first.lookAt)).toBe(true)
          return
        }
        if (t >= last.t) {
          expect(nearVec(got.position, last.position)).toBe(true)
          expect(nearVec(got.lookAt, last.lookAt)).toBe(true)
          return
        }
        let i = 0
        while (!(t >= keys[i].t && t < keys[i + 1].t)) i++
        const a = keys[i]
        const b = keys[i + 1]
        const f = (t - a.t) / (b.t - a.t)
        const mix = (p: Vec3, q: Vec3): Vec3 => ({
          x: p.x + (q.x - p.x) * f,
          y: p.y + (q.y - p.y) * f,
          z: p.z + (q.z - p.z) * f,
        })
        expect(nearVec(got.position, mix(a.position, b.position))).toBe(true)
        expect(nearVec(got.lookAt, mix(a.lookAt, b.lookAt))).toBe(true)
      }),
      RUNS,
    )
  })

  it('returns null without keys, and the midpoint between two keys', () => {
    expect(interpolateCamera(undefined, 1)).toBeNull()
    expect(interpolateCamera([], 1)).toBeNull()
    const keys: CameraKey[] = [
      { t: 0, position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
      { t: 2, position: { x: 4, y: 0, z: 0 }, lookAt: { x: 0, y: 2, z: 0 } },
    ]
    expect(interpolateCamera(keys, 1)).toEqual({ position: { x: 2, y: 0, z: 0 }, lookAt: { x: 0, y: 1, z: 0 } })
    expect(interpolateCamera(keys, -5)!.position.x).toBe(0)
    expect(interpolateCamera(keys, 9)!.position.x).toBe(4)
  })
})

const shotArb = fc
  .tuple(fc.integer({ min: 0, max: 40 }), fc.integer({ min: -5, max: 20 }))
  .map(([from, len]) => mkShot(from / 4, (from + len) / 4))

describe('selectShot', () => {
  // Feature: engine-core, Property 37: Shot selection
  // **Validates: Requirements 14.1, 14.3, 14.4, 14.5, 14.6, 14.7, 14.10, 14.11**
  it('ignores degenerate shots and picks the last-listed shot whose [from, to) holds t', () => {
    fc.assert(
      fc.property(fc.array(shotArb, { maxLength: 8 }), fc.integer({ min: -4, max: 60 }), (shots, tq) => {
        const t = tq / 4
        let expected: Shot | null = null
        for (const s of shots) if (s.to > s.from && t >= s.from && t < s.to) expected = s
        expect(selectShot(shots, t)).toBe(expected)
        const sel = evaluateShot(shots, t)
        if (expected) {
          expect(sel!.shot).toBe(expected)
          expect(sel!.u).toBeGreaterThanOrEqual(0)
          expect(sel!.u).toBeLessThan(1)
        } else {
          expect(sel).toBeNull()
        }
      }),
      RUNS,
    )
  })

  it('selects at from with u = 0, hands a shared boundary to the next shot, and releases at the last to', () => {
    const a = mkShot(0, 2)
    const b = mkShot(2, 4)
    expect(evaluateShot([a, b], 0)!.u).toBe(0)
    expect(selectShot([a, b], 2)).toBe(b)
    expect(selectShot([b, a], 2)).toBe(b)
    expect(selectShot([a, b], 4)).toBeNull()
    expect(selectShot([a, b], 1.999)).toBe(a)
    expect(selectShot([a, b], -0.001)).toBeNull()
  })

  it('picks the last listed of overlapping shots and ignores to <= from', () => {
    const a = mkShot(0, 4)
    const b = mkShot(1, 3)
    expect(selectShot([a, b], 2)).toBe(b)
    expect(selectShot([a, b], 3.5)).toBe(a)
    const flat = mkShot(1, 1)
    const inverted = mkShot(3, 2)
    expect(selectShot([a, flat, inverted], 1)).toBe(a)
    expect(selectShot([flat, inverted], 1)).toBeNull()
    expect(selectShot(undefined, 1)).toBeNull()
  })
})

describe('shot fov and far', () => {
  // Feature: engine-core, Property 38: Shot fov/far application
  // **Validates: Requirements 14.2**
  it('reports fov and far only when the selected shot sets them', () => {
    const opt = fc.option(fc.double({ min: 1, max: 5000, noNaN: true }), { nil: undefined })
    fc.assert(
      fc.property(fc.array(fc.tuple(shotArb, opt, opt), { maxLength: 6 }), fc.integer({ min: -4, max: 60 }), (entries, tq) => {
        const t = tq / 4
        const shots = entries.map(([s, fov, far]) => {
          const out = { ...s }
          if (fov !== undefined) out.fov = fov
          if (far !== undefined) out.far = far
          return out
        })
        const sel = evaluateShot(shots, t)
        const shot = selectShot(shots, t)
        if (!shot) {
          expect(sel).toBeNull()
          return
        }
        expect(sel!.fov).toBe(shot.fov)
        expect(sel!.far).toBe(shot.far)
        expect('fov' in sel! ? sel!.fov !== undefined : shot.fov === undefined).toBe(true)
      }),
      RUNS,
    )
  })

  it('passes u and t to cam and reports the result', () => {
    const calls: Array<[number, number]> = []
    const shot: Shot = {
      from: 1,
      to: 3,
      fov: 40,
      cam: (u, t) => {
        calls.push([u, t])
        return pose
      },
    }
    const sel = evaluateShot([shot], 2)!
    expect(calls).toEqual([[0.5, 2]])
    expect(sel.fov).toBe(40)
    expect(sel.far).toBeUndefined()
  })
})

const shakeKeys: fc.Arbitrary<ShakeKey[]> = keyTimes.chain((ts) =>
  fc
    .array(fc.double({ min: 0, max: 2, noNaN: true }), { minLength: ts.length, maxLength: ts.length })
    .map((amps) => ts.map((t, i) => ({ t: t / 4, amp: amps[i] })).sort((a, b) => a.t - b.t)),
)

describe('shakeAmplitude', () => {
  // Feature: engine-core, Property 39: Shake amplitude interpolation and reduced motion
  // **Validates: Requirements 14.8, 14.9, 14.10**
  it('interpolates linearly, holds at the ends and scales by 0.25 under reduced motion', () => {
    fc.assert(
      fc.property(shakeKeys, fc.double({ min: -10, max: 60, noNaN: true }), (keys, t) => {
        let expected: number
        const first = keys[0]
        const last = keys[keys.length - 1]
        if (t <= first.t) expected = first.amp
        else if (t >= last.t) expected = last.amp
        else {
          let i = 0
          while (!(t >= keys[i].t && t < keys[i + 1].t)) i++
          const f = (t - keys[i].t) / (keys[i + 1].t - keys[i].t)
          expected = keys[i].amp + (keys[i + 1].amp - keys[i].amp) * f
        }
        expect(near(shakeAmplitude(keys, t, false), expected)).toBe(true)
        expect(near(shakeAmplitude(keys, t, true), expected * 0.25)).toBe(true)
      }),
      RUNS,
    )
  })

  it('is zero without keys and exact at a few known points', () => {
    expect(shakeAmplitude(undefined, 1, false)).toBe(0)
    expect(shakeAmplitude([], 1, true)).toBe(0)
    const keys: ShakeKey[] = [
      { t: 1, amp: 0 },
      { t: 3, amp: 0.4 },
    ]
    expect(shakeAmplitude(keys, 0, false)).toBe(0)
    expect(shakeAmplitude(keys, 2, false)).toBeCloseTo(0.2)
    expect(shakeAmplitude(keys, 9, false)).toBe(0.4)
    expect(shakeAmplitude(keys, 9, true)).toBeCloseTo(0.1)
  })
})

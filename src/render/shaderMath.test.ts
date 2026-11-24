import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { BAYER4, bayer4, quantize } from './bayer'
import { grainSeed, grainTerm, toGamma, toLinear, vignetteMul, fringeSamples } from './ps1Math'
import { snapClip, snapStep, snapVertex } from './snap'
import { isValidFogSpec } from './fogSpec'
import { normalizeMaterialOptions } from './materialOptions'

const int = fc.integer({ min: -1000, max: 1000 })
const unit = fc.double({ min: 0, max: 1, noNaN: true })

describe('bayer and quantize', () => {
  it('has period 4, range [0,1), 16 distinct values', () => {
    fc.assert(
      fc.property(int, int, (x, y) => {
        const b = bayer4(x, y)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThan(1)
        expect(bayer4(x + 4, y)).toBe(b)
        expect(bayer4(x, y + 4)).toBe(b)
      }),
      { numRuns: 100 },
    )
    const vals = new Set<number>()
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) vals.add(bayer4(x, y))
    expect(vals.size).toBe(16)
    expect(BAYER4.length).toBe(4)
  })
  it('quantize is a multiple of 1/63 and within 1/63 of input', () => {
    fc.assert(
      fc.property(unit, int, int, (c, x, y) => {
        const q = quantize(c, bayer4(x, y))
        expect(q).toBeGreaterThanOrEqual(0)
        expect(q).toBeLessThanOrEqual(1)
        expect(Math.abs(q * 63 - Math.round(q * 63))).toBeLessThan(1e-9)
        expect(Math.abs(q - c)).toBeLessThanOrEqual(1 / 63 + 1e-12)
      }),
      { numRuns: 100 },
    )
  })
})

describe('ps1 math', () => {
  it('gamma round trips', () => {
    fc.assert(
      fc.property(unit, (c) => {
        expect(toLinear(toGamma(c))).toBeCloseTo(c, 9)
      }),
      { numRuns: 100 },
    )
  })
  it('fringe offset follows the formula', () => {
    fc.assert(
      fc.property(unit, unit, unit, (u, v, f) => {
        const s = fringeSamples(u, v, f)
        expect(s.r.x).toBeCloseTo(u - (u - 0.5) * f * 0.012, 12)
        expect(s.b.y).toBeCloseTo(v + (v - 0.5) * f * 0.012, 12)
        expect(s.g).toEqual({ x: u, y: v })
      }),
      { numRuns: 100 },
    )
  })
  it('vignette follows the formula and stays in [0,1]', () => {
    expect(vignetteMul(0.5, 0.5, 1)).toBe(1)
    fc.assert(
      fc.property(unit, unit, unit, (u, v, g) => {
        const m = vignetteMul(u, v, g)
        const vx = u * 2 - 1
        const vy = v * 2 - 1
        expect(m).toBeCloseTo(Math.min(1, Math.max(0, 1 - (vx * vx + vy * vy) * g * 0.55)), 12)
        expect(m).toBeGreaterThanOrEqual(0)
        expect(m).toBeLessThanOrEqual(1)
      }),
      { numRuns: 100 },
    )
  })
  it('grain is bounded by noise * 0.015', () => {
    fc.assert(
      fc.property(int, int, int, unit, (x, y, seed, n) => {
        expect(Math.abs(grainTerm(x, y, seed, n))).toBeLessThanOrEqual(n * 0.015 + 1e-12)
      }),
      { numRuns: 100 },
    )
  })
  it('grain seed is stable inside a 1/24 s window and changes across windows', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), fc.double({ min: 0, max: 0.99, noNaN: true }), (k, f) => {
        const t0 = (k + 0.001) / 24
        const t1 = (k + f) / 24
        expect(grainSeed(t1)).toBe(grainSeed(t0))
        expect(grainSeed((k + 1.001) / 24)).toBe(grainSeed(t0) + 1)
      }),
      { numRuns: 100 },
    )
  })
})

describe('vertex snap', () => {
  const res = fc.constantFrom(960, 640, 480, 320)
  it('is grid aligned, idempotent and within one step', () => {
    fc.assert(
      fc.property(fc.double({ min: -1, max: 1, noNaN: true }), res, (v, r) => {
        const s = snapClip(v, r)
        const step = snapStep(r)
        expect(Math.abs(s / step - Math.round(s / step))).toBeLessThan(1e-6)
        expect(snapClip(s, r)).toBe(s)
        expect(Math.abs(s - v)).toBeLessThan(step)
      }),
      { numRuns: 100 },
    )
  })
  it('leaves x and y unchanged when w is not positive', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -5, max: 5, noNaN: true }),
        fc.double({ min: -5, max: 5, noNaN: true }),
        fc.double({ min: -5, max: 0, noNaN: true }),
        (x, y, w) => {
          expect(snapVertex(x, y, w, 640, 360)).toEqual({ x, y })
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('fog and options', () => {
  it('validates fog specs', () => {
    expect(isValidFogSpec({ near: 6, far: 25 })).toBe(true)
    expect(isValidFogSpec({ near: 0, far: 1 })).toBe(true)
    expect(isValidFogSpec({ near: 5, far: 5 })).toBe(false)
    expect(isValidFogSpec({ near: -1, far: 5 })).toBe(false)
    expect(isValidFogSpec({ near: 1, far: NaN })).toBe(false)
  })
  it('normalizer fills defaults and is idempotent', () => {
    const n = normalizeMaterialOptions({})
    expect(n).toMatchObject({ kind: 'lambert', snap: true, fog: true, vertexColors: false, textureSeed: 0 })
    fc.assert(
      fc.property(
        fc.record({
          kind: fc.option(fc.constantFrom('unlit', 'lambert') as fc.Arbitrary<'unlit' | 'lambert'>, { nil: undefined }),
          snap: fc.option(fc.boolean(), { nil: undefined }),
          fog: fc.option(fc.boolean(), { nil: undefined }),
          textureSeed: fc.option(fc.integer(), { nil: undefined }),
        }),
        (o) => {
          const a = normalizeMaterialOptions(o)
          expect(normalizeMaterialOptions(a)).toEqual(a)
          expect(a.kind).toBeDefined()
        },
      ),
      { numRuns: 100 },
    )
  })
})

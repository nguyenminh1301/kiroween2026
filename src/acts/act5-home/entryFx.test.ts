import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ATTACK, FLIGHT_ROLL, entryGlow, particleAt } from './entryFx'

describe('entry glow', () => {
  it('builds, peaks and fades over the shot', () => {
    expect(entryGlow(4)).toBe(0)
    expect(entryGlow(6)).toBeGreaterThan(0.3)
    expect(entryGlow(6)).toBeLessThan(1)
    expect(entryGlow(8.5)).toBe(1)
    expect(entryGlow(12)).toBeCloseTo(0.25)
    expect(entryGlow(20)).toBe(0)
  })
  it('stays in 0..1 and rises then falls', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 30, noNaN: true }), (t) => {
        const g = entryGlow(t)
        expect(g).toBeGreaterThanOrEqual(0)
        expect(g).toBeLessThanOrEqual(1)
      }),
    )
    expect(entryGlow(5)).toBeLessThan(entryGlow(7))
    expect(entryGlow(10)).toBeGreaterThan(entryGlow(11.5))
  })
})

describe('attitude', () => {
  it('points the heat shield forward, 20 degrees off the path', () => {
    // The shield normal is local -y; rotated by FLIGHT_ROLL about z it is (sin r, -cos r).
    const nx = Math.sin(FLIGHT_ROLL)
    const ny = -Math.cos(FLIGHT_ROLL)
    expect(nx).toBeGreaterThan(0.9)
    expect((Math.atan2(Math.abs(ny), nx) * 180) / Math.PI).toBeCloseTo(20, 0)
    expect(ATTACK).toBeCloseTo(0.35)
  })
})

describe('sparks and flakes', () => {
  it('start near the shield and trail behind it, falling a little', () => {
    fc.assert(
      fc.property(fc.tuple(fc.double({ min: 0, max: 0.999, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true })), fc.double({ min: 0, max: 60, noNaN: true }), (seed, time) => {
        const p = particleAt(seed, time)
        expect(p.age).toBeGreaterThanOrEqual(0)
        expect(p.age).toBeLessThan(1)
        expect(p.x).toBeLessThanOrEqual(0.8 + 1e-9)
      }),
    )
    const late = particleAt([0, 0.25, 0.5, 1], 2.5)
    expect(late.x).toBeLessThan(-30)
  })
})

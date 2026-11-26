import { describe, expect, it } from 'vitest'
import { ENGINE_OFFSETS, flicker, plumeLength, trenchEmission, trenchFraction, widthAtBells } from './plume'

describe('liftoff plume', () => {
  it('has five engines and is about as wide as the first stage at the bells', () => {
    expect(ENGINE_OFFSETS).toHaveLength(5)
    expect(widthAtBells()).toBeGreaterThan(9)
    expect(widthAtBells()).toBeLessThan(12)
  })
  it('grows with height up to about the first stage length', () => {
    expect(plumeLength(0, 1)).toBeLessThan(plumeLength(30, 1))
    expect(plumeLength(200, 1)).toBeGreaterThan(40)
    expect(plumeLength(200, 1)).toBeLessThan(46)
    expect(plumeLength(50, 0)).toBe(0)
  })
  it('puts most flame into the trench near the pad and none high up', () => {
    expect(trenchFraction(0)).toBe(1)
    expect(trenchFraction(5)).toBeGreaterThan(0.9)
    expect(trenchFraction(100)).toBe(0)
  })
  it('pours clouds from ignition, strongest around liftoff, gone once the rocket is high', () => {
    expect(trenchEmission(2)).toBe(0)
    expect(trenchEmission(5)).toBeGreaterThan(trenchEmission(3.6))
    expect(trenchEmission(12)).toBeLessThan(0.05)
  })
  it('flickers within 15 percent and not at all when reduced', () => {
    for (let t = 0; t < 3; t += 0.01) expect(Math.abs(flicker(t, 2, 1) - 1)).toBeLessThan(0.15)
    expect(flicker(1.3, 1, 0)).toBe(1)
  })
})

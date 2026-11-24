import { describe, expect, it } from 'vitest'
import { breathRate, heartbeatLevel } from './bodyMath'

describe('breathRate', () => {
  it('maps 60, 120 and 180 bpm', () => {
    expect(breathRate(60)).toBeCloseTo(12)
    expect(breathRate(120)).toBeCloseTo(26)
    expect(breathRate(180)).toBeCloseTo(40)
  })
  it('clamps out of range input', () => {
    expect(breathRate(0)).toBe(12)
    expect(breathRate(-50)).toBe(12)
    expect(breathRate(500)).toBe(40)
  })
  it('counts NaN as 60 bpm', () => {
    expect(breathRate(NaN)).toBe(12)
  })
})

describe('heartbeatLevel', () => {
  it('is silent at 100 and below, full at 180', () => {
    expect(heartbeatLevel(72)).toBe(0)
    expect(heartbeatLevel(100)).toBe(0)
    expect(heartbeatLevel(140)).toBeCloseTo(0.5)
    expect(heartbeatLevel(180)).toBe(1)
    expect(heartbeatLevel(NaN)).toBe(0)
  })
})

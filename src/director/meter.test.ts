import { describe, expect, it } from 'vitest'
import { meterFill, meterLabel, meterRed, noiseRatio } from './meter'

describe('noise meter', () => {
  it('divides noise by the hearing threshold', () => {
    expect(noiseRatio(0.45, 5)).toBeCloseTo(1)
    expect(meterFill(1)).toBeCloseTo(0.8)
    expect(meterFill(9)).toBe(1)
    expect(meterRed(0.6)).toBe(false)
    expect(meterRed(0.65)).toBe(true)
  })
  it('picks the label', () => {
    expect(meterLabel('patrol', false, false)).toBe('IT IS LISTENING')
    expect(meterLabel('alert', false, false)).toBe('IT HEARD YOU')
    expect(meterLabel('hunt', true, true)).toBe('HIDDEN')
    expect(meterLabel('search', true, true)).toBe('IT IS SEARCHING')
    expect(meterLabel('patrol', false, true)).toBe('SILENT')
  })
})

import { describe, expect, it } from 'vitest'
import { groundSeconds, readingSeconds } from './lineTiming'

describe('readingSeconds', () => {
  it('uses seconds when set', () => {
    expect(readingSeconds({ text: 'x'.repeat(200), seconds: 2.5 })).toBe(2.5)
  })
  it('floors short text at 2.4 s', () => {
    expect(readingSeconds({ text: 'Hi' })).toBe(2.4)
  })
  it('uses 1.2 + length / 15 for long text', () => {
    expect(readingSeconds({ text: 'x'.repeat(60) })).toBeCloseTo(5.2)
  })
})

describe('groundSeconds', () => {
  it('ground adds two tones', () => {
    expect(groundSeconds(2.5, 0.25)).toBe(3)
  })
})

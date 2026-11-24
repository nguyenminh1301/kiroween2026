import { describe, expect, it } from 'vitest'
import { groundSeconds, readingSeconds, voicedSeconds } from './lineTiming'

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

describe('voicedSeconds and groundSeconds', () => {
  it('voiced is file + 0.3 but at least 60% of reading', () => {
    expect(voicedSeconds(5, 6)).toBeCloseTo(6.3)
    expect(voicedSeconds(10, 2)).toBeCloseTo(6)
    expect(voicedSeconds(5, null)).toBe(5)
  })
  it('ground adds two tones', () => {
    expect(groundSeconds(2.5, 0.25)).toBe(3)
  })
})

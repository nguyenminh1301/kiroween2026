import { describe, expect, it } from 'vitest'
import { DEFAULT_LEVEL, LEVEL_TABLE, levelCount, lookupLevel } from './levelTable'

describe('levelTable', () => {
  it('has the four literal entries', () => {
    expect(LEVEL_TABLE).toEqual([
      [960, 540],
      [640, 360],
      [480, 270],
      [320, 180],
    ])
    expect(DEFAULT_LEVEL).toBe(1)
    expect(levelCount()).toBe(4)
  })
  it('clamps out of range levels', () => {
    expect(lookupLevel(-3)).toEqual({ width: 960, height: 540 })
    expect(lookupLevel(9)).toEqual({ width: 320, height: 180 })
  })
  it('returns 16:9 for every level', () => {
    for (let i = 0; i < 4; i++) {
      const { width, height } = lookupLevel(i)
      expect(width * 9).toBe(height * 16)
    }
  })
})

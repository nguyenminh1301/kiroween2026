import { describe, expect, it } from 'vitest'
import { DEFAULT_LEVEL, LEVEL_TABLE, levelCount, lookupLevel, lowestLevelAtLeast } from './levelTable'

describe('levelTable', () => {
  it('has the six literal entries', () => {
    expect(LEVEL_TABLE).toEqual([
      [1920, 1080],
      [1280, 720],
      [960, 540],
      [640, 360],
      [480, 270],
      [320, 180],
    ])
    expect(DEFAULT_LEVEL).toBe(3)
    expect(lookupLevel(DEFAULT_LEVEL)).toEqual({ width: 640, height: 360 })
    expect(levelCount()).toBe(6)
  })
  it('clamps out of range levels', () => {
    expect(lookupLevel(-3)).toEqual({ width: 1920, height: 1080 })
    expect(lookupLevel(9)).toEqual({ width: 320, height: 180 })
  })
  it('returns 16:9 for every level', () => {
    for (let i = 0; i < levelCount(); i++) {
      const { width, height } = lookupLevel(i)
      expect(width * 9).toBe(height * 16)
    }
  })
  it('finds the lowest level at least a width', () => {
    expect(lowestLevelAtLeast(640)).toBe(3)
    expect(lowestLevelAtLeast(960)).toBe(2)
  })
})

import { describe, expect, it } from 'vitest'
import { dprFor, gameViewSize } from './gameView'

describe('gameViewSize', () => {
  it('fills a 1280x720 window', () => {
    expect(gameViewSize(1280, 720)).toEqual({ x: 0, y: 0, width: 1280, height: 720 })
  })
  it('letterboxes a tall window', () => {
    const r = gameViewSize(1000, 1000)
    expect(r.width).toBe(1000)
    expect(r.y).toBeGreaterThan(0)
  })
  it('pillarboxes a wide window', () => {
    const r = gameViewSize(2000, 500)
    expect(r.height).toBe(500)
    expect(r.x).toBeGreaterThan(0)
  })
  it('returns zero rect for bad input', () => {
    for (const [w, h] of [[0, 5], [5, 0], [-1, 4], [NaN, 3], [Infinity, 3]]) {
      expect(gameViewSize(w, h)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
    }
  })
  it('dprFor maps rect width to internal width', () => {
    expect(dprFor(640, { x: 0, y: 0, width: 1280, height: 720 })).toBe(0.5)
    expect(dprFor(640, { x: 0, y: 0, width: 0, height: 0 })).toBe(1)
  })
})

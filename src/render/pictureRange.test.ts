import { describe, expect, it } from 'vitest'
import { lookupLevel } from './levelTable'
import { levelFitting, pictureRange } from './pictureRange'

const w = (n: number) => lookupLevel(n).width

describe('pictureRange', () => {
  it('finds the highest level that fits', () => {
    expect(w(levelFitting(2400))).toBe(1920)
    expect(w(levelFitting(1920))).toBe(1920)
    expect(w(levelFitting(1700))).toBe(1280)
    expect(w(levelFitting(1280))).toBe(1280)
    expect(w(levelFitting(1000))).toBe(960)
    expect(w(levelFitting(700))).toBe(640)
    expect(w(levelFitting(100))).toBe(320)
    expect(w(levelFitting(NaN))).toBe(320)
  })
  it('sharp starts at 1280 on a 1700 px view, never above 1280 at the start', () => {
    const r = pictureRange('sharp', 1700)
    expect(w(r.start)).toBe(1280)
    expect(w(r.top)).toBe(1280)
    expect(w(r.floor)).toBe(640)
  })
  it('sharp on a view of 1920 px or more may climb to 1080p but starts at 720p', () => {
    const r = pictureRange('sharp', 2400)
    expect(w(r.start)).toBe(1280)
    expect(w(r.top)).toBe(1920)
  })
  it('sharp on a small view uses what fits', () => {
    expect(w(pictureRange('sharp', 1000).start)).toBe(960)
    expect(w(pictureRange('sharp', 700).start)).toBe(640)
    expect(w(pictureRange('sharp', 400).start)).toBe(640)
  })
  it('balanced is 960x540 and drops to 640x360 only', () => {
    const r = pictureRange('balanced', 1700)
    expect([w(r.start), w(r.top), w(r.floor)]).toEqual([960, 960, 640])
    expect(w(pictureRange('balanced', 700).start)).toBe(640)
  })
  it('retro is 640x360 and may go lower', () => {
    const r = pictureRange('retro', 1700)
    expect([w(r.start), w(r.top), w(r.floor)]).toEqual([640, 640, 320])
  })
  it('start is always inside the range', () => {
    for (const p of ['sharp', 'balanced', 'retro'] as const) {
      for (const px of [0, 300, 700, 960, 1500, 1920, 3000]) {
        const r = pictureRange(p, px)
        expect(r.start).toBeGreaterThanOrEqual(r.top)
        expect(r.start).toBeLessThanOrEqual(r.floor)
      }
    }
  })
})

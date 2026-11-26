import { describe, expect, it } from 'vitest'
import { windowViewAt } from '../acts/act5-home/timeline'
import { viewDirections, windowDefs } from './cabin/windows'
import { paintWindowView, type WindowViewSpec } from './windowView'

const rightWin = windowDefs().find((d) => d.key === 'right')!
const spec: WindowViewSpec = { w: 32, h: 24, round: false, dirs: viewDirections(rightWin, 32, 24), seed: 1 }
const px = (b: Uint8Array, x: number, yTop: number) => {
  const i = ((spec.h - 1 - yTop) * spec.w + x) * 4
  return [b[i], b[i + 1], b[i + 2], b[i + 3]]
}

describe('window view', () => {
  it('fills every pixel opaque and keeps an Earth disc inside the buffer', () => {
    const b = new Uint8Array(spec.w * spec.h * 4)
    paintWindowView(b, spec, { mode: 'sky', sky: [0, 0, 0], t: 0, earth: true })
    for (let i = 3; i < b.length; i += 4) expect(b[i]).toBe(255)
    // The disc is in the right window: some texel is Earth coloured, and the corners stay black sky or stars.
    let blue = 0
    for (let y = 0; y < spec.h; y++) for (let x = 0; x < spec.w; x++) {
        const c = px(b, x, y)
        if (c[2] > 60 && c[2] > c[0] + 20) blue++
      }
    expect(blue).toBeGreaterThan(60)
    expect(px(b, 0, 0).slice(0, 3).every((c) => c < 256)).toBe(true)
    // Another window shows no Earth at all.
    const left = windowDefs().find((d) => d.key === 'left')!
    const lb = new Uint8Array(spec.w * spec.h * 4)
    paintWindowView(lb, { ...spec, dirs: viewDirections(left, 32, 24) }, { mode: 'sky', sky: [0, 0, 0], t: 0, earth: true })
    let leftBlue = 0
    for (let i = 0; i < lb.length; i += 4) if (lb[i + 2] > 60 && lb[i + 2] > lb[i] + 20) leftBlue++
    expect(leftBlue).toBe(0)
  })

  it('shows the Earth only in the window flagged for it, and keeps it in view through the whole turn', () => {
    const blue = (b: Uint8Array) => {
      let n = 0
      for (let i = 0; i < b.length; i += 4) if (b[i + 2] > 60 && b[i + 2] > b[i] + 20) n++
      return n
    }
    const b = new Uint8Array(spec.w * spec.h * 4)
    paintWindowView(b, { ...spec, earthWindow: false }, { mode: 'sky', sky: [0, 0, 0], t: 0, earth: true })
    expect(blue(b)).toBe(0)
    for (const t of [0, 10, 30, 60, 90]) {
      paintWindowView(b, spec, { mode: 'sky', sky: [0, 0, 0], t, earth: true, spin: 0 })
      expect(blue(b)).toBeGreaterThan(60)
    }
  })

  it('moves the stars when the spacecraft turns', () => {
    const a = new Uint8Array(spec.w * spec.h * 4)
    const b = new Uint8Array(spec.w * spec.h * 4)
    const st = { mode: 'sky' as const, sky: [0, 0, 0] as const, t: 0, earth: false }
    paintWindowView(a, spec, { ...st, spin: 0 })
    paintWindowView(b, spec, { ...st, spin: 0.5 })
    expect(Buffer.compare(Buffer.from(a), Buffer.from(b))).not.toBe(0)
  })

  it('paints plasma orange and sea blue', () => {
    const b = new Uint8Array(spec.w * spec.h * 4)
    paintWindowView(b, spec, { mode: 'plasma', sky: [0, 0, 0], t: 1, earth: false })
    const p = px(b, 3, 3)
    expect(p[0]).toBeGreaterThan(p[2] + 80)
    paintWindowView(b, spec, { mode: 'sea', sky: [94, 143, 200], t: 1, earth: false })
    const s = px(b, 4, 23)
    expect(s[2]).toBeGreaterThan(s[0])
  })

  it('act 5 shows plasma only in the burn, the sea after splashdown', () => {
    expect(windowViewAt(5)).toBe('sky')
    expect(windowViewAt(15)).toBe('plasma')
    expect(windowViewAt(30)).toBe('sky')
    expect(windowViewAt(50)).toBe('sea')
  })
})

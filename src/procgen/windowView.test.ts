import { describe, expect, it } from 'vitest'
import { windowViewAt } from '../acts/act5-home/timeline'
import { paintWindowView, type WindowViewSpec } from './windowView'

const spec: WindowViewSpec = { w: 32, h: 24, round: false, earth: { cx: 0.9, cy: 0.5, r: 0.5 }, seed: 1 }
const px = (b: Uint8Array, x: number, yTop: number) => {
  const i = ((spec.h - 1 - yTop) * spec.w + x) * 4
  return [b[i], b[i + 1], b[i + 2], b[i + 3]]
}

describe('window view', () => {
  it('fills every pixel opaque and keeps an Earth disc inside the buffer', () => {
    const b = new Uint8Array(spec.w * spec.h * 4)
    paintWindowView(b, spec, { mode: 'sky', sky: [0, 0, 0], t: 0, earth: true })
    for (let i = 3; i < b.length; i += 4) expect(b[i]).toBe(255)
    // The disc is centred near the right edge: its centre is blue-ish, the far left stays black sky.
    const c = px(b, 29, 12)
    expect(c[2]).toBeGreaterThan(40)
    expect(px(b, 1, 12).slice(0, 3)).toEqual([0, 0, 0])
  })

  it('paints plasma orange and sea blue', () => {
    const b = new Uint8Array(spec.w * spec.h * 4)
    paintWindowView(b, spec, { mode: 'plasma', sky: [0, 0, 0], t: 1, earth: false })
    const p = px(b, 3, 3)
    expect(p[0]).toBeGreaterThan(p[2] + 80)
    paintWindowView(b, spec, { mode: 'sea', sky: [94, 143, 200], t: 1, earth: false })
    const s = px(b, 4, 22)
    expect(s[2]).toBeGreaterThan(s[0])
  })

  it('act 5 shows plasma only in the burn, the sea after splashdown', () => {
    expect(windowViewAt(5)).toBe('sky')
    expect(windowViewAt(15)).toBe('plasma')
    expect(windowViewAt(30)).toBe('sky')
    expect(windowViewAt(50)).toBe('sea')
  })
})

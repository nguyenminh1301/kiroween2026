import { describe, expect, it } from 'vitest'
import { BAR_HEIGHT, GAME_MIN, usesFullPage, windowLayout } from './windowLayout'

describe('windowLayout', () => {
  it('takes at least 90% of the viewport and a 16:9 game box', () => {
    for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 720], [2560, 1440], [1600, 1200], [1440, 600]]) {
      const l = windowLayout(w, h)
      expect(l.panelW).toBeGreaterThanOrEqual(w * 0.9)
      expect(l.panelH).toBeGreaterThanOrEqual(h * 0.9)
      expect(l.panelW).toBeLessThanOrEqual(w)
      expect(l.panelH).toBeLessThanOrEqual(h)
      expect(Math.abs(l.gameW / l.gameH - 16 / 9)).toBeLessThan(0.02)
      expect(l.gameH + BAR_HEIGHT).toBeLessThanOrEqual(l.panelH)
    }
  })
  it('keeps the game box at 960 by 540 or more when the viewport allows it', () => {
    const l = windowLayout(1000, 640)
    expect(l.gameW).toBeGreaterThanOrEqual(GAME_MIN.w - 2)
    expect(l.gameH).toBeGreaterThanOrEqual(GAME_MIN.h - 2)
  })
  it('never grows past the viewport', () => {
    const l = windowLayout(900, 500)
    expect(l.panelW).toBeLessThanOrEqual(900)
    expect(l.panelH).toBeLessThanOrEqual(500)
  })
  it('sends phones and touch screens to the full page', () => {
    expect(usesFullPage(800, true)).toBe(true)
    expect(usesFullPage(1280, false)).toBe(true)
    expect(usesFullPage(900, true)).toBe(false)
  })
})

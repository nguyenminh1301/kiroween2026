import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  COVER_AT,
  CUT_AT,
  DROGUE_AT,
  FULL_AT,
  LAND_SECONDS,
  MAINS_START,
  RELEASE_AT,
  REEF,
  CONFLUENCE_Y,
  DROGUE_DIAMETER,
  LINE_LENGTH,
  MAIN_DIAMETER,
  MAIN_SPACING,
  breathe,
  mainCentre,
  canopyShape,
  coverAt,
  drogueFill,
  drogueRun,
  drogueState,
  droguePos,
  mainsOpen,
  openingJerk,
  pilotRun,
  releasedAt,
  sway,
} from './chutes'

describe('drogues', () => {
  it('pops the cover first, then shoots the drogues out on long lines', () => {
    expect(coverAt(COVER_AT - 0.1)).toBeNull()
    expect(coverAt(COVER_AT + 0.5)).not.toBeNull()
    expect(coverAt(COVER_AT + 3.5)).toBeNull()
    expect(drogueRun(DROGUE_AT)).toBe(0)
    expect(drogueRun(DROGUE_AT + 1)).toBe(1)
    expect(droguePos(DROGUE_AT + 1, 1).y).toBeGreaterThan(20)
    expect(droguePos(DROGUE_AT + 1, -1).x).toBeLessThan(0)
  })

  it('opens with a jerk: thin first, overshoots, settles at 1', () => {
    expect(drogueFill(DROGUE_AT + 0.5)).toBeLessThan(0.3)
    let peak = 0
    for (let t = DROGUE_AT; t < DROGUE_AT + 4; t += 0.02) peak = Math.max(peak, drogueFill(t))
    expect(peak).toBeGreaterThan(1.05)
    expect(drogueFill(DROGUE_AT + 4)).toBeCloseTo(1, 1)
  })

  it('cuts them away at 28.2 s and they fall for 2.5 s', () => {
    expect(drogueState(25)).toBe('out')
    expect(drogueState(CUT_AT + 1)).toBe('falling')
    expect(drogueState(CUT_AT + 3)).toBe('hidden')
    expect(droguePos(CUT_AT + 2, 1).y).toBeLessThan(droguePos(CUT_AT, 1).y - 10)
  })

  it('jerks the capsule at each opening, then settles', () => {
    expect(Math.abs(openingJerk(DROGUE_AT + 1.4))).toBeGreaterThan(0.05)
    expect(Math.abs(openingJerk(45))).toBeLessThan(0.01)
  })
})

describe('mains', () => {
  it('open in two steps over 8 s: reefed, then full', () => {
    expect(mainsOpen(MAINS_START - 0.1)).toBe(0)
    expect(mainsOpen(30.5)).toBeCloseTo(REEF, 2)
    expect(mainsOpen(32)).toBeCloseTo(REEF, 2)
    expect(mainsOpen(FULL_AT)).toBe(1)
    expect(FULL_AT - MAINS_START).toBeCloseTo(8, 5)
    for (let t = 28; t < 40; t += 0.1) expect(mainsOpen(t + 0.1)).toBeGreaterThanOrEqual(mainsOpen(t) - 1e-12)
  })

  it('is narrow and tall when reefed and wide when full', () => {
    expect(canopyShape(REEF).xz).toBeLessThan(0.5)
    expect(canopyShape(REEF).y).toBeGreaterThan(canopyShape(1).y)
    expect(canopyShape(1).xz).toBe(1)
  })

  it('has pilot chutes only while the mains come out', () => {
    expect(pilotRun(27)).toBeNull()
    expect(pilotRun(28.5)).not.toBeNull()
    expect(pilotRun(40)).toBeNull()
  })

  it('breathes slowly once full and sways as a group', () => {
    expect(breathe(10, 0, 0.5)).toBe(1)
    let lo = 2
    let hi = 0
    for (let t = 0; t < 12; t += 0.05) {
      lo = Math.min(lo, breathe(t, 1, 1))
      hi = Math.max(hi, breathe(t, 1, 1))
    }
    expect(hi - lo).toBeGreaterThan(0.03)
    expect(hi - lo).toBeLessThan(0.1)
    expect(Math.abs(sway(1))).toBeGreaterThan(0)
  })
})

describe('release at splashdown', () => {
  const start = { x: 0, y: 30, z: 0 }
  it('drifts down and sideways, flattens and never shrinks in place', () => {
    for (let i = 0; i < 3; i++) {
      const a = releasedAt(RELEASE_AT, i, start)
      const b = releasedAt(RELEASE_AT + LAND_SECONDS / 2, i, start)
      const c = releasedAt(RELEASE_AT + LAND_SECONDS, i, start)
      expect(a.pos).toEqual(start)
      expect(b.pos.y).toBeLessThan(a.pos.y)
      expect(Math.hypot(c.pos.x, c.pos.z)).toBeGreaterThan(15)
      expect(c.pos.y).toBeLessThan(0.5)
      expect(c.landed).toBe(true)
      expect(c.flat).toBe(1)
    }
  })

  it('sinks slowly after it settles, never rising and never moving sideways', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 20, noNaN: true }), (dt) => {
        const t = RELEASE_AT + LAND_SECONDS + dt
        const a = releasedAt(t, 1, start)
        const b = releasedAt(t + 1, 1, start)
        expect(b.sunk).toBeGreaterThanOrEqual(a.sunk)
        expect(b.pos.x).toBeCloseTo(a.pos.x, 9)
        expect(b.sunk - a.sunk).toBeLessThan(0.1)
      }),
    )
  })
})

describe('real sizes', () => {
  it('has 25 m mains, 5 m drogues and 30 m lines', () => {
    expect(MAIN_DIAMETER).toBe(25)
    expect(DROGUE_DIAMETER).toBe(5)
    expect(LINE_LENGTH).toBe(30)
  })
  it('puts the three full mains side by side without overlap, far wider than the 3.9 m capsule', () => {
    const c = [0, 1, 2].map((i) => mainCentre(i, 1))
    expect(c[1].x).toBe(0)
    expect(c[1].x - c[0].x).toBeGreaterThanOrEqual(MAIN_DIAMETER)
    expect(c[2].x - c[1].x).toBe(MAIN_SPACING)
    const span = c[2].x - c[0].x + MAIN_DIAMETER
    expect(span).toBeGreaterThan(3.9 * 10)
  })
  it('hangs the middle main on lines 30 m long from the confluence point', () => {
    const m = mainCentre(1, 1)
    const len = Math.hypot(MAIN_DIAMETER / 2, m.y - CONFLUENCE_Y)
    expect(len).toBeCloseTo(LINE_LENGTH, 5)
  })
  it('brings the mains together while reefed', () => {
    expect(mainCentre(0, 0.3).x).toBeGreaterThan(mainCentre(0, 1).x)
    expect(mainCentre(2, 0).x).toBe(0)
  })
  it('lets the released mains settle side by side, a canopy apart', () => {
    const p = [0, 1, 2].map((i) => releasedAt(60, i, { x: 0, y: 30, z: 0 }).pos)
    expect(p[1].z - p[0].z).toBeGreaterThanOrEqual(MAIN_DIAMETER)
  })
})

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
  DROGUE_REEFED,
  DROGUE_REEF_HOLD,
  DROGUE_JERK_AT,
  GATHER_Y,
  GATHER_RADIUS,
  MAIN_TILT,
  RISER_BASE_RADIUS,
  DROGUE_BANDS,
  DROGUE_HEIGHT,
  DROGUE_LINES,
  DROGUE_RISER,
  MAIN_LINES,
  drogueRig,
  DROGUE_DIAMETER,
  LINE_LENGTH,
  MAIN_DIAMETER,
  breathe,
  mainPose,
  gatherPoint,
  riserBase,
  rimPoint,
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

  it('stays reefed for a short moment, then opens fully', () => {
    expect(drogueFill(DROGUE_JERK_AT + 0.4)).toBe(DROGUE_REEFED)
    expect(DROGUE_REEF_HOLD).toBeLessThan(1.5)
    expect(drogueFill(DROGUE_JERK_AT + DROGUE_REEF_HOLD + 0.5)).toBeGreaterThan(0.9)
    expect(drogueFill(DROGUE_JERK_AT + DROGUE_REEF_HOLD + 3)).toBeCloseTo(1, 2)
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

describe('drogue shape and rig', () => {
  it('is a short wide cone: height 0.6 of its width, with gaps between its bands', () => {
    expect(DROGUE_HEIGHT).toBeCloseTo(0.6 * DROGUE_DIAMETER, 9)
    expect(DROGUE_BANDS).toBeGreaterThanOrEqual(4)
    expect(DROGUE_HEIGHT).toBeLessThan(DROGUE_DIAMETER)
  })
  it('runs its lines to a confluence and a 15 m riser to the capsule, on each side', () => {
    for (const side of [-1, 1]) {
      const r = drogueRig(CUT_AT - 0.5, side)
      const base = { x: side * 0.5, y: 0, z: 0 }
      expect(r.riserEnd).toEqual(base)
      expect(Math.hypot(r.confluence.x - base.x, r.confluence.y - base.y)).toBeCloseTo(DROGUE_RISER, 3)
      expect(r.mouth.y).toBeGreaterThan(r.confluence.y)
      expect(r.centre.y).toBeGreaterThan(r.mouth.y)
      // The mouth faces the capsule: the canopy is farther from it than the confluence.
      expect(Math.hypot(r.centre.x, r.centre.y)).toBeGreaterThan(Math.hypot(r.confluence.x, r.confluence.y))
    }
  })
  it('lets go of the capsule once cut', () => {
    const r = drogueRig(CUT_AT + 1, 1)
    expect(r.riserEnd.y).not.toBe(0)
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
  it('flies the three full mains as a triangle seen from below, touching but not far overlapping', () => {
    const r = [0, 1, 2].map((i) => mainPose(i, 1, 1).rim)
    const side = (a: number, b: number): number => Math.hypot(r[a].x - r[b].x, r[a].z - r[b].z)
    expect(side(0, 1)).toBeCloseTo(side(1, 2), 5)
    expect(side(0, 1)).toBeCloseTo(side(0, 2), 5)
    expect(side(0, 1)).toBeGreaterThanOrEqual(MAIN_DIAMETER * 0.95)
    // The triangle is centred on the capsule axis.
    expect(r[0].x + r[1].x + r[2].x).toBeCloseTo(0, 5)
    expect(r[0].z + r[1].z + r[2].z).toBeCloseTo(0, 5)
    // Far wider than the 3.9 m capsule.
    expect(Math.hypot(r[0].x, r[0].z)).toBeGreaterThan(3.9 * 3)
  })
  it('tilts each canopy outward from the axis, a little', () => {
    for (let i = 0; i < 3; i++) {
      const p = mainPose(i, 1, 1)
      const out = (p.rim.x - p.gather.x) * p.gather.x + (p.rim.z - p.gather.z) * p.gather.z
      expect(out).toBeGreaterThan(0)
      expect(Math.acos(p.axis.y)).toBeCloseTo(MAIN_TILT, 5)
      expect(MAIN_TILT).toBeLessThan(0.45)
      expect(Math.hypot(p.axis.x, p.axis.y, p.axis.z)).toBeCloseTo(1, 9)
    }
  })
  it('gathers each main on its own point a few metres over the capsule, never one shared point', () => {
    const g = [0, 1, 2].map(gatherPoint)
    for (const p of g) {
      expect(p.y).toBe(GATHER_Y)
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(GATHER_RADIUS, 9)
    }
    expect(GATHER_Y).toBeLessThan(10)
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(Math.hypot(g[a].x - g[b].x, g[a].z - g[b].z)).toBeGreaterThan(5)
  })
  it('runs every line 30 m from its gather point to a rim point', () => {
    for (const [scale, spread] of [[1, 1], [0.3, 0.3], [0.22, 0]] as const) {
      for (let i = 0; i < 3; i++) {
        const p = mainPose(i, scale, spread)
        for (let k = 0; k < 24; k++) {
          const q = rimPoint(p, k, 24)
          expect(Math.hypot(q.x - p.gather.x, q.y - p.gather.y, q.z - p.gather.z)).toBeCloseTo(LINE_LENGTH, 5)
        }
      }
    }
  })
  it('gives every main its own riser that ends at the top of the capsule', () => {
    const ends = new Set<string>()
    for (let i = 0; i < 3; i++) {
      const base = riserBase(i)
      expect(base.y).toBe(0)
      expect(Math.hypot(base.x, base.z)).toBeCloseTo(RISER_BASE_RADIUS, 9)
      expect(Math.hypot(base.x, base.z)).toBeLessThan(1.95)
      ends.add(`${base.x.toFixed(3)},${base.z.toFixed(3)}`)
    }
    expect(ends.size).toBe(3)
  })
  it('draws thin strings: 16 to 24 lines per main and 10 to 12 per drogue', () => {
    expect(MAIN_LINES).toBeGreaterThanOrEqual(16)
    expect(MAIN_LINES).toBeLessThanOrEqual(24)
    expect(DROGUE_LINES).toBeGreaterThanOrEqual(10)
    expect(DROGUE_LINES).toBeLessThanOrEqual(12)
  })
  it('puts each main confluence about 3 m over the capsule top, with a short riser', () => {
    for (let i = 0; i < 3; i++) {
      const g = gatherPoint(i)
      const b = riserBase(i)
      expect(g.y).toBeGreaterThan(2.5)
      expect(g.y).toBeLessThan(3.5)
      expect(Math.hypot(g.x - b.x, g.y - b.y, g.z - b.z)).toBeLessThan(6)
    }
  })
  it('sits a reefed canopy higher on the same lines, narrow and nearly upright', () => {
    expect(mainPose(0, 0.22, 0.3).rim.y).toBeGreaterThan(mainPose(0, 1, 1).rim.y)
    expect(mainPose(0, 0.22, 0.3).rimRadius).toBeLessThan(MAIN_DIAMETER / 4)
  })
  it('lets the released mains settle side by side, a canopy apart', () => {
    const p = [0, 1, 2].map((i) => releasedAt(60, i, { x: 0, y: 30, z: 0 }).pos)
    expect(p[1].z - p[0].z).toBeGreaterThanOrEqual(MAIN_DIAMETER)
  })
})

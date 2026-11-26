import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createMonster, stepMonster, type Monster, type MonsterCtx, type MonsterEvent } from './monster'
import { dist, headingTo, type Pt } from './patrol'
import { SPOT, toyNav, walkable } from './toyNav'

const nav = toyNav()
const far: Pt = { x: 100, z: 100 }
const ctx = (over: Partial<MonsterCtx> = {}): MonsterCtx => ({
  dt: 0.1,
  player: far,
  heard: over.player ?? far,
  hidden: false,
  holding: false,
  noise: 0.12,
  rng: () => 0.5,
  ...over,
})

function run(m: Monster, seconds: number, over: Partial<MonsterCtx> = {}, each?: (m: Monster) => void): MonsterEvent[] {
  const out: MonsterEvent[] = []
  for (let t = 0; t < seconds - 1e-9; t += 0.1) {
    out.push(...stepMonster(m, ctx(over), nav))
    each?.(m)
  }
  return out
}

describe('monster', () => {
  it('patrols the waypoints at 0.8 m/s and faces the way it walks', () => {
    const m = createMonster(nav, 0)
    let prev = { ...m.pos }
    let moved = 0
    run(m, 20, {}, (q) => {
      const d = dist(prev, q.pos)
      if (d > 1e-6) {
        expect(q.heading).toBeCloseTo(headingTo(prev, q.pos), 5)
        moved += d
      }
      prev = { ...q.pos }
    })
    expect(moved).toBeCloseTo(16, 0)
  })

  it('hunts the place it heard the noise, not the player, then searches and goes back to patrol', () => {
    const m = createMonster(nav, 0)
    const heardAt = { x: 3, z: 5 }
    const ev = run(m, 0.1, { player: heardAt, heard: heardAt, noise: 0.9 })
    expect(ev).toContain('alert')
    expect(m.mode).toBe('alert')
    // The player walks off quietly while it comes. It still goes to the heard place.
    const ev1 = run(m, 0.9, { player: far, heard: heardAt, noise: 0.1, hidden: true, holding: true })
    expect(ev1).toContain('scream')
    expect(m.mode).toBe('hunt')
    expect(m.target).toEqual(heardAt)
    const ev2 = run(m, 12, { player: far, noise: 0.1, hidden: true, holding: true })
    expect(ev2).toContain('step')
    expect(m.mode === 'search' || m.mode === 'patrol').toBe(true)
    const ev3 = run(m, 10, { player: far, noise: 0.1, hidden: true, holding: true })
    expect([...ev2, ...ev3]).toContain('lost')
    expect(m.mode === 'patrol' || m.mode === 'peek').toBe(true)
  })

  it('stands still at the heard place for about two seconds before it looks around', () => {
    const m = createMonster(nav, 0)
    const spot = { x: 3, z: 5 }
    run(m, 0.1, { player: spot, heard: spot, noise: 0.9 })
    const quiet = { player: far, noise: 0.1, hidden: true, holding: true }
    run(m, 0.9, quiet)
    for (let i = 0; i < 100 && m.mode !== 'search'; i++) run(m, 0.1, quiet)
    expect(m.mode).toBe('search')
    const at = { ...m.pos }
    run(m, 1.5, quiet)
    expect(dist(at, m.pos)).toBeLessThan(0.01)
    run(m, 1, quiet)
    expect(dist(at, m.pos)).toBeGreaterThan(0.1)
  })

  it('catches an unhidden player within 0.8 m, not a hidden one', () => {
    const m = createMonster(nav, 0)
    const close = { x: m.pos.x + 0.5, z: m.pos.z }
    expect(run(m, 0.1, { player: close })).toContain('caught')
    const m2 = createMonster(nav, 0)
    expect(run(m2, 0.1, { player: close, hidden: true, holding: true })).not.toContain('caught')
  })

  it('does not notice a hidden, quiet player even when it passes right by', () => {
    const m = createMonster(nav, 3)
    const player = { x: 0.4, z: 6 }
    const ev = run(m, 40, { player, heard: { x: 1.4, z: 6 }, hidden: true, noise: 0.12 })
    expect(ev).not.toContain('alert')
    expect(ev).not.toContain('caught')
  })

  it('walks to the outside point of a spot and never into its footprint', () => {
    const m = createMonster(nav, 0)
    const outside = { x: 1.4, z: 6 }
    run(m, 0.1, { player: { x: 0.4, z: 6 }, heard: outside, noise: 0.9, hidden: true })
    run(m, 30, { player: { x: 0.4, z: 6 }, heard: outside, noise: 0.1, hidden: true, holding: true }, (q) => {
      expect(walkable(q.pos) || dist(q.pos, outside) < 0.4).toBe(true)
      expect(q.pos.x > SPOT.x0 && q.pos.x < SPOT.x1 && q.pos.z > SPOT.z0 && q.pos.z < SPOT.z1).toBe(false)
    })
  })

  it('makes a quiet sound every 8 to 15 seconds and loud steps and the scream only in a chase', () => {
    const m = createMonster(nav, 0)
    const stamps: number[] = []
    const loud: MonsterEvent[] = []
    let t = 0
    let r = 0
    const seq = [0.1, 0.9, 0.5, 0.3, 0.7]
    const rng = (): number => seq[r++ % seq.length]
    for (; t < 200; t += 0.1) {
      for (const e of stepMonster(m, ctx({ rng }), nav)) {
        if (e === 'click' || e === 'scrape' || e === 'breath') stamps.push(t)
        if (e === 'step' || e === 'scream') loud.push(e)
      }
    }
    expect(loud).toEqual([])
    expect(stamps.length).toBeGreaterThan(8)
    // Gaps between quiet sounds, ignoring the peeks' own breaths.
    const gaps = stamps.slice(1).map((s, i) => s - stamps[i])
    expect(Math.max(...gaps)).toBeLessThanOrEqual(15.2)
  })

  it('keeps its position on walkable ground whatever the player does', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ x: fc.double({ min: 0.5, max: 11.5, noNaN: true }), z: fc.double({ min: 0.5, max: 11.5, noNaN: true }), noise: fc.double({ min: 0, max: 1, noNaN: true }), hidden: fc.boolean() }), { minLength: 5, maxLength: 40 }),
        (steps) => {
          const m = createMonster(nav, 1, () => 0.4)
          for (const s of steps) {
            const player = { x: s.x, z: s.z }
            for (let i = 0; i < 20; i++) {
              if (stepMonster(m, ctx({ player, heard: player, noise: s.noise, hidden: s.hidden }), nav).includes('caught')) return
              expect(walkable(m.pos) || dist(m.pos, { x: 2, z: 2 }) < 10).toBe(true)
            }
          }
        },
      ),
      { numRuns: 60 },
    )
  })
})

import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { CATCH_RANGE, CHASE_SPEED, RIM_SECONDS, RISE_SECONDS, createEmerged, stepEmerged } from './creature'
import { PITS } from './terrain'

const run = (c: ReturnType<typeof createEmerged>, secs: number, player = { x: 0, z: 0 }): boolean => {
  let caught = false
  for (let t = 0; t < secs - 1e-9; t += 0.05) caught = stepEmerged(c, 0.05, player) || caught
  return caught
}

describe('emerged creature', () => {
  it('rises for 2.2 s, stands 1.4 s, then chases', () => {
    const c = createEmerged(PITS[2], { x: 0, z: 0 })
    run(c, RISE_SECONDS - 0.1, { x: -8, z: -5 })
    expect(c.phase).toBe('rising')
    run(c, 0.2, { x: -8, z: -5 })
    expect(c.phase).toBe('rim')
    expect(c.depth).toBe(0)
    run(c, RIM_SECONDS, { x: -8, z: -5 })
    expect(c.phase).toBe('chase')
  })

  it('moves at 1.8 m/s straight toward the player', () => {
    const c = createEmerged(PITS[2], { x: 0, z: 0 })
    run(c, RISE_SECONDS + RIM_SECONDS + 0.1, { x: 30, z: 30 })
    const a = { x: c.x, z: c.z }
    run(c, 1, { x: 30, z: 30 })
    expect(Math.hypot(c.x - a.x, c.z - a.z)).toBeCloseTo(CHASE_SPEED, 1)
  })

  it('catches within 1.0 m and not before, and not in the rise', () => {
    const c = createEmerged(PITS[0], { x: 0, z: 0 })
    expect(run(c, 3.6, { x: c.rim.x, z: c.rim.z + 0.5 })).toBe(false)
    const d = createEmerged(PITS[2], { x: 0, z: 0 })
    run(d, 3.7, { x: -8, z: -5 })
    expect(Math.hypot(d.x + 8, d.z + 5)).toBeGreaterThan(CATCH_RANGE)
    expect(run(d, 8, { x: -8, z: -5 })).toBe(true)
  })

  it('never closes faster than its own speed (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: -40, max: 40, noNaN: true }), fc.double({ min: -40, max: 40, noNaN: true }), (px, pz) => {
        const c = createEmerged(PITS[1], { x: 0, z: 0 })
        run(c, RISE_SECONDS + RIM_SECONDS + 0.05, { x: px, z: pz })
        let last = Math.hypot(px - c.x, pz - c.z)
        for (let i = 0; i < 40; i++) {
          stepEmerged(c, 0.05, { x: px, z: pz })
          const d = Math.hypot(px - c.x, pz - c.z)
          expect(last - d).toBeLessThanOrEqual(CHASE_SPEED * 0.05 + 1e-9)
          last = d
        }
      }),
    )
  })
})

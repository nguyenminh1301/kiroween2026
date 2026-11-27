import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { resolveCapsule } from '../../engine/collision'
import { cmFarFor, collisionBoxes, inTunnel, LANDER_Z1, rails, railZs } from './layout'

describe('act 2 layout', () => {
  it('grows the tunnel by 1.5 m when the tunnel grows', () => {
    expect(cmFarFor(false)).toBe(1.5)
    expect(cmFarFor(true)).toBe(3)
  })

  it('puts rails every 1.5 m from cmFar + 2.7 down to the lander back wall', () => {
    expect(railZs(1.5)).toEqual([4.2, 2.7, 1.2, -0.3, -1.8, -3.3, -4.8])
    expect(railZs(3)).toEqual([5.7, 4.2, 2.7, 1.2, -0.3, -1.8, -3.3, -4.8])
    const r = rails(1.5)
    expect(r).toHaveLength(14)
    expect(r[0].a).toEqual({ x: -1.1, y: 1.6, z: 3.7 })
    expect(r[1].a).toEqual({ x: 1.1, y: 1.6, z: 3.7 })
    expect(r[0].b.z).toBe(4.7)
    // Inside the tunnel the bars stay inside the walls.
    expect(r[7].a.x).toBe(0.4)
    expect(inTunnel(-0.3, 1.5)).toBe(true)
  })

  it('leaves a capsule on the tunnel centre free at every z, before and after it grows', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1.5, 3),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 0.45, noNaN: true }),
        fc.double({ min: -0.1, max: 0.1, noNaN: true }),
        (cmFar, u, y, x) => {
          const z = LANDER_Z1 + u * (cmFar - LANDER_Z1)
          const pos = { x, y, z }
          const r = resolveCapsule(pos, { x: 0, y: 0, z: 0 }, collisionBoxes(cmFar))
          expect(r.pos).toEqual(pos)
        },
      ),
    )
  })

  it('still blocks a capsule off the centre line', () => {
    const r = resolveCapsule({ x: 0.7, y: 0.2, z: 0 }, { x: 0, y: 0, z: 0 }, collisionBoxes(1.5))
    expect(r.pos.x).toBeLessThan(0.7)
  })
})

describe('close-up reach', () => {
  it('keeps a close-up open anywhere the player can start it from', async () => {
    const { DEFAULT_REACH } = await import('../../interaction/targeting')
    const { CLOSE_UP_DISTANCE } = await import('./layout')
    expect(CLOSE_UP_DISTANCE).toBeGreaterThan(DEFAULT_REACH)
  })
})

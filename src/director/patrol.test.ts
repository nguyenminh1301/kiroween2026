import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { dist, headingTo, nearbyNodes, nearestPatrol, pathLength, route } from './patrol'
import { toyClear, toyNav, walkable } from './toyNav'

const nav = toyNav()

describe('waypoint graph', () => {
  it('links nodes only where the walk keeps clear of walls', () => {
    expect(nav.adj[0]).toContain(1)
    // Across the block: (2,2) to (10,10) would cut through it.
    expect(nav.adj[0]).not.toContain(2)
    expect(toyClear({ x: 2, z: 2 }, { x: 10, z: 10 })).toBe(false)
  })

  it('routes around the block through corner nodes', () => {
    const r = route(nav, { x: 2, z: 2 }, { x: 10, z: 10 })
    expect(r.length).toBeGreaterThanOrEqual(2)
    expect(r[r.length - 1]).toEqual({ x: 10, z: 10 })
    expect(pathLength({ x: 2, z: 2 }, r)).toBeCloseTo(16, 0)
  })

  it('goes straight when the line is clear', () => {
    expect(route(nav, { x: 2, z: 2 }, { x: 9, z: 2 })).toEqual([{ x: 9, z: 2 }])
  })

  it('never cuts across a wall corner, for any two walkable points', () => {
    const pt = fc.record({ x: fc.double({ min: 0.4, max: 11.6, noNaN: true }), z: fc.double({ min: 0.4, max: 11.6, noNaN: true }) })
    fc.assert(
      fc.property(pt, pt, (a, b) => {
        fc.pre(walkable(a) && walkable(b))
        let at = a
        for (const p of route(nav, a, b)) {
          expect(toyClear(at, p)).toBe(true)
          at = p
        }
      }),
      { numRuns: 200 },
    )
  })

  it('finds the nearest patrol waypoint and the nodes near a point', () => {
    expect(nearestPatrol(nav, { x: 9, z: 9 })).toBe(2)
    const near = nearbyNodes(nav, { x: 2, z: 2 }, 5, 2, () => 0)
    expect(near.length).toBe(2)
    for (const n of near) expect(dist(n, { x: 2, z: 2 })).toBeLessThanOrEqual(5)
  })

  it('faces the way it walks: heading 0 is -z', () => {
    expect(headingTo({ x: 0, z: 0 }, { x: 0, z: -1 })).toBeCloseTo(0)
    expect(headingTo({ x: 0, z: 0 }, { x: 1, z: 0 })).toBeCloseTo(-Math.PI / 2)
  })
})

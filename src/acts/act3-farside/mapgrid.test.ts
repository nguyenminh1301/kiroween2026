import { describe, expect, it } from 'vitest'
import { Grid } from './mapgrid'

// An L: a vertical bar of two columns and a horizontal arm at the bottom.
const g = new Grid(
  [
    { c0: 1, r0: 0, c1: 2, r1: 3 },
    { c0: 3, r0: 2, c1: 5, r1: 3 },
  ],
  2,
  0,
  8,
  6,
)

describe('map grid', () => {
  it('finds cells from world positions', () => {
    expect(g.cellOf(0.1, -0.1)).toEqual([2, 0])
    expect(g.openAt(-0.1, -0.1)).toBe(true)
    expect(g.openAt(-2, -0.1)).toBe(false)
    expect(g.center(2, 0)).toEqual({ x: 0.6, z: -0.6 })
  })

  it('merges wall edges into runs', () => {
    const edges = g.edges()
    const runs = g.runs()
    expect(runs.length).toBeLessThan(edges.length)
    const total = (list: typeof edges): number => list.reduce((s, e) => s + (e.to - e.from), 0)
    expect(total(runs)).toBeCloseTo(total(edges))
  })

  it('keeps a radius clear of walls along a straight line and refuses a corner cut', () => {
    expect(g.lineClear({ x: 0, z: -0.6 }, { x: 0, z: -3.4 }, 0.35)).toBe(true)
    // From the vertical bar's middle straight to the arm's far end cuts the inner corner.
    expect(g.lineClear({ x: 0, z: -1.2 }, { x: 4.5, z: -3.6 }, 0.35)).toBe(false)
    expect(g.clearAt(-1.1, -0.6, 0.35)).toBe(false)
  })
})

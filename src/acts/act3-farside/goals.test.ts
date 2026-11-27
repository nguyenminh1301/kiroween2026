import { describe, expect, it } from 'vitest'
import { BAGS_MARKER, CAGE_GLOW_RANGE, cageDoorDistance, cageGlow, syncCarryMarker } from './goals'
import { CAGE } from './layout'

describe('cage door glow', () => {
  it('is off beyond 3 m and on within it', () => {
    expect(cageGlow(CAGE_GLOW_RANGE + 0.1, false, 0)).toBe(0)
    expect(cageGlow(CAGE_GLOW_RANGE - 0.1, false, 0)).toBeGreaterThan(0.2)
    expect(cageGlow(NaN, false, 0)).toBe(0)
  })
  it('grows as the player comes close and stays within 0 to 1', () => {
    for (let t = 0; t < 6; t += 0.3) {
      expect(cageGlow(0.5, false, t)).toBeGreaterThan(cageGlow(2.5, false, t))
      for (const d of [0, 1, 2, 3]) {
        const g = cageGlow(d, false, t)
        expect(g).toBeGreaterThanOrEqual(0)
        expect(g).toBeLessThanOrEqual(1)
      }
    }
  })
  it('goes out when the door is open', () => {
    expect(cageGlow(1, true, 0)).toBe(0)
  })
  it('measures the distance to the door on the floor', () => {
    expect(cageDoorDistance(0, CAGE.z + 3)).toBeCloseTo(3)
    expect(cageDoorDistance(0.4, CAGE.z)).toBeCloseTo(0.4)
  })
})

describe('carry marker', () => {
  it('shows over the bags while he is carried, whatever the objective, and hides when he is set down', () => {
    expect(syncCarryMarker(undefined, true)).toEqual([BAGS_MARKER])
    expect(syncCarryMarker(['act3:locker0'], true)).toEqual(['act3:locker0', BAGS_MARKER])
    expect(syncCarryMarker([BAGS_MARKER], true)).toBeNull()
    expect(syncCarryMarker([BAGS_MARKER, 'x'], false)).toEqual(['x'])
    expect(syncCarryMarker([], false)).toBeNull()
  })
})

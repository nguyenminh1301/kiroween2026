import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { pickTarget, type Pickable } from './targeting'

const eye = { x: 0, y: 1.65, z: 0 }
const dir = { x: 0, y: 0, z: 1 }

const item = (id: string, z: number, enabled: boolean, radius = 0.3, reach?: number): Pickable => ({
  id,
  position: { x: 0, y: 1.65, z },
  radius,
  enabled: () => enabled,
  reach,
})

describe('pickTarget', () => {
  // Feature: interaction-ui, Property 1: the nearest enabled target in reach wins
  it('returns the nearest enabled item within reach, or none', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            z: fc.double({ min: 0.5, max: 8, noNaN: true }),
            enabled: fc.boolean(),
            radius: fc.double({ min: 0.1, max: 0.5, noNaN: true }),
          }),
          { maxLength: 8 },
        ),
        (rows) => {
          const items = rows.map((r, i) => item(`i${i}`, r.z, r.enabled, r.radius))
          const got = pickTarget(eye, dir, items)
          const ok = rows
            .map((r, i) => ({ ...r, i, t: Math.max(0, r.z - r.radius) }))
            .filter((r) => r.enabled && r.t <= 2.5)
            .sort((a, b) => a.t - b.t)
          if (ok.length === 0) expect(got).toBeNull()
          else expect(got?.id).toBe(`i${ok[0].i}`)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('ignores items behind the eye and off the ray', () => {
    const behind = item('behind', -1, true)
    const side: Pickable = { ...item('side', 1, true), position: { x: 2, y: 1.65, z: 1 } }
    expect(pickTarget(eye, dir, [behind, side])).toBeNull()
  })

  it('honours a larger reach set by the act', () => {
    expect(pickTarget(eye, dir, [item('far', 4, true, 0.3, 5)])?.id).toBe('far')
    expect(pickTarget(eye, dir, [item('far', 4, true)])).toBeNull()
  })
})

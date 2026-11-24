import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Box } from '../../engine/collision'
import type { MoveMode } from '../../types'
import { canStartTestTimeline, isInsideZone, nextMoveMode } from './logic'
import { ZERO_G_ZONE } from './room'

const zone: Box = { min: { x: -1, y: 1, z: -2 }, max: { x: 3, y: 5, z: 2 } }
const coord = fc.double({ min: -6, max: 8, noNaN: true })
const eyeArb = fc.record({ x: coord, y: coord, z: coord })

describe('sandbox logic', () => {
  it('treats the zone faces as inside', () => {
    expect(isInsideZone(zone.min, zone)).toBe(true)
    expect(isInsideZone(zone.max, zone)).toBe(true)
    expect(isInsideZone({ x: 3.001, y: 2, z: 0 }, zone)).toBe(false)
  })

  it('has a real zone in the room layout', () => {
    expect(ZERO_G_ZONE.min.x).toBeLessThan(ZERO_G_ZONE.max.x)
  })

  it('never changes a seated player', () => {
    expect(nextMoveMode('seated', true)).toBe('seated')
    expect(nextMoveMode('seated', false)).toBe('seated')
  })

  // Feature: engine-core, Property 53: Zero-g zone toggles move mode on enter/leave
  it('is zeroG while the eye is inside the zone and walk once it leaves', () => {
    fc.assert(
      fc.property(fc.array(eyeArb, { minLength: 1, maxLength: 40 }), (eyes) => {
        let mode: MoveMode = 'walk'
        for (const eye of eyes) {
          const inside = isInsideZone(eye, zone)
          mode = nextMoveMode(mode, inside)
          expect(mode).toBe(inside ? 'zeroG' : 'walk')
        }
      }),
      { numRuns: 100 },
    )
  })

  it('canStartTestTimeline is true only for none or finished', () => {
    expect(canStartTestTimeline(null)).toBe(true)
    expect(canStartTestTimeline({ finished: true })).toBe(true)
    expect(canStartTestTimeline({ finished: false })).toBe(false)
  })
})

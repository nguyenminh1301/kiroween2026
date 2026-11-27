import { describe, expect, it } from 'vitest'
import { PHOTO_SPOT, photoAim } from './layout'
import { SITES } from './terrain'

const toward = (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => ({
  x: to.x - from.x,
  y: to.y - from.y,
  z: to.z - from.z,
})
const flagTop = { x: SITES.flag.x, y: 1, z: SITES.flag.z }

describe('photo mark', () => {
  it('sits about 3 m from the flag, beside it', () => {
    const d = Math.hypot(PHOTO_SPOT.x - SITES.flag.x, PHOTO_SPOT.z - SITES.flag.z)
    expect(d).toBeGreaterThan(3)
    expect(d).toBeLessThan(3.5)
  })
  it('starts the photo only inside the ring and looking at the flag', () => {
    const inside = { x: PHOTO_SPOT.x + 0.3, y: 1.65, z: PHOTO_SPOT.z }
    expect(photoAim(inside, toward(inside, flagTop))).toBe(true)
    expect(photoAim(inside, { x: 1, y: 0, z: 0 })).toBe(false)
    const outside = { x: PHOTO_SPOT.x + 2, y: 1.65, z: PHOTO_SPOT.z }
    expect(photoAim(outside, toward(outside, flagTop))).toBe(false)
  })
})

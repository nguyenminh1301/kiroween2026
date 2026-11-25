import { describe, expect, it } from 'vitest'
import { flashIntensity, FLASH_FULL, nearStrength, rayBoxDistance } from './flashlight'

const box = { min: { x: -1, y: -1, z: -5 }, max: { x: 1, y: 1, z: -4 } }

describe('flashlight', () => {
  it('measures the distance to a box', () => {
    expect(rayBoxDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, [box], 20)).toBeCloseTo(4)
    expect(rayBoxDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, [box], 20)).toBe(20)
  })
  it('softens the beam close up and not far away', () => {
    expect(nearStrength(0.3)).toBeCloseTo(0.2)
    expect(nearStrength(1.5)).toBeLessThan(0.45)
    expect(nearStrength(4)).toBeCloseTo(1)
  })
  it('is off in a locker', () => {
    expect(flashIntensity(true, 10)).toBe(0)
    expect(flashIntensity(false, 10)).toBe(FLASH_FULL)
  })
})

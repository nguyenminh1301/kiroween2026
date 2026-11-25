import { describe, expect, it } from 'vitest'
import { creatureProgress, driftPose, LOOP_S } from './backdropMath'

describe('backdropMath', () => {
  it('loops with no jump every 24 s', () => {
    const a = driftPose(3.3)
    const b = driftPose(3.3 + LOOP_S)
    expect(b.z).toBeCloseTo(a.z, 6)
    expect(b.x).toBeCloseTo(a.x, 6)
    expect(b.yaw).toBeCloseTo(a.yaw, 6)
  })
  it('moves the creature for 5 s every 14 s', () => {
    expect(creatureProgress(0)).toBe(0)
    expect(creatureProgress(2.5)).toBeCloseTo(0.5)
    expect(creatureProgress(5.1)).toBeNull()
    expect(creatureProgress(14.5)).toBeCloseTo(0.1)
    expect(creatureProgress(13.9)).toBeNull()
  })
})

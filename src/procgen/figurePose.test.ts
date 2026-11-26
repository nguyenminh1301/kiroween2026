import { describe, expect, it } from 'vitest'
import { poseFor } from './figurePose'

describe('working pose', () => {
  it('loops every 9 s and keeps every angle finite', () => {
    for (let t = 0; t < 9; t += 0.37) {
      const a = poseFor('working', t)
      const b = poseFor('working', t + 9)
      expect(b.bones.shoulderR[0]).toBeCloseTo(a.bones.shoulderR[0], 9)
      for (const r of Object.values(a.bones)) for (const v of r) expect(Number.isFinite(v)).toBe(true)
    }
  })
  it('moves the arm: it reaches at 1 s and rests at 5 s', () => {
    expect(poseFor('working', 1.8).bones.shoulderR[0]).toBeLessThan(poseFor('working', 5).bones.shoulderR[0])
  })
})

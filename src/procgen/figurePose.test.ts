import { describe, expect, it } from 'vitest'
import { WALK_RATE, poseFor } from './figurePose'

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

describe('hanging pose', () => {
  it('flips the body upside down, lets the arms dangle toward the floor and keeps every angle finite', () => {
    for (let t = 0; t < 20; t += 0.7) {
      const p = poseFor('hanging', t)
      expect(p.rootRotX).toBeCloseTo(Math.PI)
      // An arm rotated by about pi around x points the other way: down in the flipped frame.
      expect(Math.abs(p.bones.shoulderL[0] - Math.PI)).toBeLessThan(0.4)
      expect(Math.abs(p.bones.shoulderR[0] - Math.PI)).toBeLessThan(0.4)
      expect(Math.abs(p.rootRotZ)).toBeLessThan(0.1)
      for (const r of Object.values(p.bones)) for (const v of r) expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('surface poses', () => {
  it('keeps every angle finite and the walk loops with its rate', () => {
    for (const k of ['walk', 'kneel', 'scoop', 'write', 'camera', 'ladder'] as const) {
      for (let t = 0; t < 6; t += 0.31) {
        const p = poseFor(k, t)
        for (const r of Object.values(p.bones)) for (const v of r) expect(Number.isFinite(v)).toBe(true)
      }
    }
    const a = poseFor('walk', 0.3)
    const b = poseFor('walk', 0.3 + 1 / WALK_RATE)
    expect(b.bones.hipL[0]).toBeCloseTo(a.bones.hipL[0], 6)
  })
  it('hops: the body leaves the ground in the walk, lowered when kneeling', () => {
    expect(Math.max(...[0.1, 0.3, 0.5, 0.7].map((t) => poseFor('walk', t).rootY))).toBeGreaterThan(0.05)
    expect(poseFor('kneel', 1).rootY).toBeLessThan(-0.3)
  })
  it('lifts the camera as amount grows', () => {
    expect(poseFor('camera', 0, 1).bones.shoulderL[0]).toBeLessThan(poseFor('camera', 0, 0).bones.shoulderL[0])
  })
})

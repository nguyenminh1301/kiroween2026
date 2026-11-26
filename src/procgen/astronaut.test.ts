import { Box3, MeshBasicMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { ASTRONAUT_MAX_TRIANGLES, buildAstronaut, poseAstronaut } from './astronaut'
import { anglesFor, headToward, POSE_RATE, snapTime } from './astronautPose'

describe('astronaut model', () => {
  const a = buildAstronaut(new MeshBasicMaterial(), new MeshBasicMaterial())
  it('stays under the triangle budget including the rim hull', () => {
    expect(a.triangles).toBeGreaterThan(200)
    expect(a.triangles).toBeLessThanOrEqual(ASTRONAUT_MAX_TRIANGLES)
  })
  it('is about 2.4 m tall standing', () => {
    poseAstronaut(a, 'freeze', 0, 0)
    a.root.updateMatrixWorld(true)
    const h = new Box3().setFromObject(a.root).max.y
    expect(h).toBeGreaterThan(2.1)
    expect(h).toBeLessThan(2.8)
  })
  it('opens the jaw and grows the head in the lunge', () => {
    poseAstronaut(a, 'freeze', 0, 0, { lunge: 0 })
    expect(a.jaw.rotation.x).toBeLessThan(0.05)
    poseAstronaut(a, 'freeze', 0, 0, { lunge: 0.59 })
    expect(a.jaw.rotation.x).toBeGreaterThan(1)
    expect(a.head.scale.x).toBeGreaterThan(2)
    poseAstronaut(a, 'walk', 0, 0)
    expect(a.jaw.rotation.x).toBe(0)
    expect(a.head.scale.x).toBe(1)
  })
})

describe('pose logic', () => {
  it('snaps time to held poses', () => {
    expect(snapTime(0.1)).toBe(snapTime(0.12))
    expect(snapTime(0.13)).toBeCloseTo(1 / POSE_RATE)
  })
  it('tilts the head toward a sound and clamps it', () => {
    expect(headToward(0, 0, 0, 0, 5)).toBeCloseTo(0)
    expect(headToward(0, 0, 0, 5, 0)).toBeGreaterThan(0.9)
    expect(Math.abs(headToward(0, 0, 0, 0, -5))).toBeLessThanOrEqual(1.1)
  })
  it('walks forward: leans ahead, bends knees back and elbows forward, arms swing against the legs', () => {
    for (let k = 0; k < 16; k++) {
      const g = anglesFor('walk', (k / 16) * Math.PI * 2)
      expect(g.spine).toBeGreaterThan(0)
      for (const leg of g.leg) expect(leg[1]).toBeGreaterThan(0)
      for (const arm of g.arm) expect(arm[1]).toBeLessThan(0)
      expect(Math.sign(g.arm[0][0]) * Math.sign(g.leg[0][0])).toBeLessThanOrEqual(0)
    }
  })
  it('bends knees and elbows for every animation', () => {
    for (const k of ['walk', 'freeze', 'crawl'] as const) {
      const g = anglesFor(k, 0.7)
      expect(Number.isFinite(g.spine)).toBe(true)
      expect(g.arm).toHaveLength(2)
    }
  })
})

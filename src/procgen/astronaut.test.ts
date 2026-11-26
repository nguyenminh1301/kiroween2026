import { Box3, MeshBasicMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { ASTRONAUT_MAX_TRIANGLES, buildAstronaut, poseAstronaut } from './astronaut'
import { anglesFor, headToward, POSE_RATE, snapTime } from './astronautPose'
import { LUNGE_TOTAL, lungeDistance, lungeFrame } from './lunge'

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
    poseAstronaut(a, 'freeze', 0, 0, { lunge: 1.1 })
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
  it('bends knees and elbows for every animation', () => {
    for (const k of ['walk', 'freeze', 'crawl'] as const) {
      const g = anglesFor(k, 0.7)
      expect(Number.isFinite(g.spine)).toBe(true)
      expect(g.arm).toHaveLength(2)
    }
  })
})

describe('lunge timeline', () => {
  it('rises, lunges, opens and covers the view in 1.2 s', () => {
    expect(LUNGE_TOTAL).toBe(1.2)
    const s = lungeFrame(0)
    expect(s).toEqual({ rise: 0, reach: 0, jaw: 0, cover: 0 })
    const m = lungeFrame(0.6)
    expect(m.rise).toBe(1)
    expect(m.reach).toBe(0)
    const e = lungeFrame(1.1)
    expect(e.reach).toBe(1)
    expect(e.jaw).toBe(1)
    expect(e.cover).toBe(0)
    expect(lungeFrame(1.2).cover).toBe(1)
    expect(lungeFrame(5).cover).toBe(1)
  })
  it('is monotonic', () => {
    let prev = lungeFrame(0)
    for (let t = 0.05; t <= 1.2; t += 0.05) {
      const f = lungeFrame(t)
      expect(f.rise).toBeGreaterThanOrEqual(prev.rise)
      expect(f.reach).toBeGreaterThanOrEqual(prev.reach)
      expect(f.jaw).toBeGreaterThanOrEqual(prev.jaw)
      expect(f.cover).toBeGreaterThanOrEqual(prev.cover)
      prev = f
    }
    expect(lungeDistance(1)).toBeLessThan(lungeDistance(0))
  })
})

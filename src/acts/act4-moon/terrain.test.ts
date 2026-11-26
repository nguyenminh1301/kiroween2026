import { describe, expect, it } from 'vitest'
import { collisionBoxes, runStart, yawToward } from './layout'
import { PITS, SITES, groundAt, rocks } from './terrain'

describe('terrain', () => {
  it('is flat at the lander and the task sites', () => {
    const spots: Array<[number, number]> = [[0, 0], ...Object.values(SITES).map((s): [number, number] => [s.x, s.z])]
    for (const [x, z] of spots) {
      for (let a = 0; a < 8; a++) {
        const r = x === 0 && z === 0 ? 5.5 : 1.8
        const h = groundAt(x + Math.cos(a) * r, z + Math.sin(a) * r)
        expect(Math.abs(h)).toBeLessThan(0.05)
      }
      expect(Math.abs(groundAt(x, z))).toBeLessThan(0.05)
    }
  })

  it('has no step along a line from the lander out 15 m', () => {
    for (const a of [0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 5, 5.7]) {
      let prev = groundAt(0, 0)
      for (let d = 0.5; d <= 15; d += 0.5) {
        const h = groundAt(Math.cos(a) * d, Math.sin(a) * d)
        expect(Math.abs(h - prev)).toBeLessThanOrEqual(0.15)
        prev = h
      }
    }
  })

  it('has no step leaving the task sites', () => {
    for (const s of Object.values(SITES)) {
      for (let a = 0; a < 6.3; a += 0.45) {
        let prev = groundAt(s.x, s.z)
        for (let d = 0.5; d <= 6; d += 0.5) {
          const h = groundAt(s.x + Math.cos(a) * d, s.z + Math.sin(a) * d)
          expect(Math.abs(h - prev)).toBeLessThanOrEqual(0.15)
          prev = h
        }
      }
    }
  })

  it('has pits lower than their rims', () => {
    for (const p of PITS) {
      let rim = -Infinity
      for (let a = 0; a < 16; a++) rim = Math.max(rim, groundAt(p.x + Math.cos(a) * p.r * 1.1, p.z + Math.sin(a) * p.r * 1.1))
      expect(groundAt(p.x, p.z)).toBeLessThan(rim - 0.5)
    }
  })

  it('is deterministic and not flat elsewhere', () => {
    expect(groundAt(30, -20)).toBe(groundAt(30, -20))
    let max = 0
    for (let i = 0; i < 40; i++) max = Math.max(max, Math.abs(groundAt(-50 + i * 2.5, 25)))
    expect(max).toBeGreaterThan(0.2)
  })

  it('keeps rocks off the sites', () => {
    for (const r of rocks()) {
      for (const s of Object.values(SITES)) expect(Math.hypot(r.x - s.x, r.z - s.z)).toBeGreaterThan(2.4)
    }
  })
})

describe('layout', () => {
  it('has a collision box for the stage and each pad', () => {
    expect(collisionBoxes()).toHaveLength(5)
  })

  it('places the run checkpoint on the dust by the ladder, facing it', () => {
    const r = runStart()
    expect(r.pos.z).toBeGreaterThan(4.3)
    expect(-Math.cos(r.yaw)).toBeLessThan(0)
    expect(yawToward(0, 0, 0, -1)).toBeCloseTo(0)
  })
})

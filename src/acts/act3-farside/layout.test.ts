import { describe, expect, it } from 'vitest'
import { resolveCapsule } from '../../engine/collision'
import { BAYS, checkpointAt, collisionBoxes, detectBump, DOORS, LOCKERS, rails } from './layout'

describe('act 3 layout', () => {
  it('puts rails every 1.5 m and keeps 0.6 m clear of openings', () => {
    const r = rails()
    expect(r.length).toBeGreaterThan(40)
    const first = r.find((x) => x.id === 'rail0l')
    expect(first?.a.x).toBe(-1.1)
    const zOf = (x: { a: { z: number }; b: { z: number } }) => (x.a.z + x.b.z) / 2
    for (const x of r.filter((q) => q.id.endsWith('l'))) for (const b of BAYS) expect(zOf(x) > b.z0 - 0.6 && zOf(x) < b.z1 + 0.6).toBe(false)
    for (const x of r.filter((q) => q.id.endsWith('r'))) for (const d of DOORS) expect(zOf(x) > d.z0 - 0.6 && zOf(x) < d.z1 + 0.6).toBe(false)
    expect(r.every((x) => x.a.y === 1.6)).toBe(true)
  })

  it('keeps the player in the corridor, out of lockers, and lets them through the doorways', () => {
    const boxes = collisionBoxes()
    const hitWall = resolveCapsule({ x: -1.1, y: 0.2, z: -5 }, { x: -2, y: 0, z: 0 }, boxes)
    expect(hitWall.pos.x).toBeGreaterThanOrEqual(-0.9 - 1e-6)
    const l = LOCKERS[0]
    const intoLocker = resolveCapsule({ x: -0.9, y: 0.2, z: l.center.z }, { x: -3, y: 0, z: 0 }, boxes)
    expect(intoLocker.pos.x).toBeGreaterThan(-1.3)
    const door = resolveCapsule({ x: 1.0, y: 0.2, z: -16.25 }, { x: 3, y: 0, z: 0 }, boxes)
    expect(door.pos.x).toBeGreaterThanOrEqual(1.0)
    const free = resolveCapsule({ x: 0, y: 0.2, z: -20 }, { x: 0, y: 0, z: -1 }, boxes)
    expect(free.vel.z).toBe(-1)
  })

  it('maps z to the furthest checkpoint passed and detects bumps', () => {
    expect(checkpointAt(-3)).toBeNull()
    expect(checkpointAt(-6)).toBe('wp0')
    expect(checkpointAt(-13)).toBe('wp1')
    expect(checkpointAt(-32)).toBe('wp2')
    expect(checkpointAt(-39)).toBe('wp3')
    expect(detectBump({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 })).toBe(true)
    expect(detectBump({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -0.9 })).toBe(false)
  })
})

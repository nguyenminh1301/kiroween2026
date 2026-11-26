import { describe, expect, it } from 'vitest'
import { resolveCapsule } from '../../engine/collision'
import { BAYS, CAGE, cageDoorBox, checkpointAt, collisionBoxes, detectBump, DOORS, LOCKERS, rails } from './layout'

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

  it('maps z to the checkpoint passed outbound and detects bumps', () => {
    expect(checkpointAt(-3)).toBeNull()
    expect(checkpointAt(-6)).toBe('wp0')
    expect(checkpointAt(-38)).toBe('wp1')
    expect(detectBump({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 })).toBe(true)
    expect(detectBump({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -0.9 })).toBe(false)
  })

  it('walks from the cabin through the doorway, stops at the cage door and the bars', () => {
    const boxes = collisionBoxes()
    const through = resolveCapsule({ x: 0, y: 0.2, z: 4.6 }, { x: 0, y: 0, z: -1 }, boxes)
    expect(through.vel.z).toBe(-1)
    const wall = resolveCapsule({ x: 0.9, y: 0.2, z: 4.6 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(wall.pos.z).toBeGreaterThanOrEqual(4.2)
    const bars = resolveCapsule({ x: 0.8, y: 0.2, z: CAGE.z + 0.5 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(bars.pos.z).toBeGreaterThan(CAGE.z)
    const door = resolveCapsule({ x: 0, y: 0.2, z: CAGE.z + 0.5 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(door.pos.z).toBeGreaterThan(CAGE.z)
    const open = collisionBoxes().filter((b) => JSON.stringify(b) !== JSON.stringify(cageDoorBox()))
    const free = resolveCapsule({ x: 0, y: 0.2, z: CAGE.z + 0.5 }, { x: 0, y: 0, z: -2 }, open)
    expect(free.vel.z).toBe(-2)
  })

  it('puts the locker eye 0.25 m behind the door face', () => {
    for (const l of LOCKERS) expect(l.center.x + 0.5 - l.inside.x).toBeCloseTo(0.25)
  })
})

import { describe, expect, it } from 'vitest'
import { resolveCapsule } from '../../engine/collision'
import { CAGE, CAGED, cageDoorBox, checkpointAt, collisionBoxes, creatureBlockers, creatureClear, crewBox, detectBump, GRID, HATCH, LOCKERS, NAV_NODES, PATROL_ROUTE, solidProps, SPOTS, CREATURE_RADIUS, WINDOW, WINDOW_CREW } from './layout'

/** Can a walker get from the cell at (x0, z0) to the cell at (x1, z1) when cells in `cut` are removed? */
function reachable(from: [number, number], to: [number, number], cut: (c: number, r: number) => boolean): boolean {
  const start = GRID.cellOf(...from)
  const goal = GRID.cellOf(...to)
  const seen = new Set<string>([start.join(',')])
  const queue = [start]
  while (queue.length) {
    const [c, r] = queue.shift() as [number, number]
    if (c === goal[0] && r === goal[1]) return true
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: [number, number] = [c + dc, r + dr]
      const k = n.join(',')
      if (seen.has(k) || !GRID.open(n[0], n[1]) || cut(n[0], n[1])) continue
      seen.add(k)
      queue.push(n)
    }
  }
  return false
}

const START: [number, number] = [0, 3]
const CAGE_CELL: [number, number] = [0, CAGE.z + 0.5]
// The straight way: the spine behind the hatch is rows 12 to 21 of columns 9 and 10.
const behindHatch = (c: number, r: number): boolean => (c === 9 || c === 10) && r >= 12 && r <= 21
const leftLoop = (c: number, r: number): boolean => (c === 4 || c === 5) && r >= 8 && r <= 21
const rightLoop = (c: number, r: number): boolean => (c === 14 || c === 15) && r >= 8 && r <= 21

describe('act 3 map', () => {
  it('has no straight way to the cage: the hatch blocks it, and each loop alone still gets there', () => {
    expect(reachable(START, CAGE_CELL, () => false)).toBe(true)
    expect(reachable(START, CAGE_CELL, behindHatch)).toBe(true)
    expect(reachable(START, CAGE_CELL, (c, r) => behindHatch(c, r) || leftLoop(c, r))).toBe(true)
    expect(reachable(START, CAGE_CELL, (c, r) => behindHatch(c, r) || rightLoop(c, r))).toBe(true)
    expect(reachable(START, CAGE_CELL, (c, r) => behindHatch(c, r) || leftLoop(c, r) || rightLoop(c, r))).toBe(false)
  })

  it('keeps the side rooms apart: each one opens only onto its loop', () => {
    // The loops are cut: a room must not reach the other room or the cage by itself.
    const leftStore: [number, number] = [-9.6, -7.4]
    const rightStore: [number, number] = [9.6, -8.6]
    const bays: Array<[number, number]> = [[-10.2, -15.2], [10.2, -14.0]]
    const noLoops = (c: number, r: number): boolean => leftLoop(c, r) || rightLoop(c, r) || (c >= 9 && c <= 10) || (r >= 6 && r <= 7)
    for (const from of [leftStore, rightStore, ...bays]) {
      for (const to of [leftStore, rightStore, ...bays, CAGE_CELL]) {
        const same = from === to
        expect(reachable(from, to, noLoops), `${from} to ${to}`).toBe(same)
      }
    }
  })

  it('keeps the wall boxes out of every open cell', () => {
    const walls = GRID.wallBoxes(2.4)
    for (const [c, r] of GRID.openCells()) {
      const m = GRID.center(c, r)
      for (const [dx, dz] of [[0, 0], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) {
        const x = m.x + dx
        const z = m.z + dz
        const hit = walls.some((b) => x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z)
        expect(hit, `cell ${c},${r}`).toBe(false)
      }
    }
  })

  it('stops the player at the hatch', () => {
    const boxes = collisionBoxes()
    const hit = resolveCapsule({ x: 0, y: 0.2, z: HATCH.z + 0.8 }, { x: 0, y: 0, z: -3 }, boxes)
    expect(hit.pos.z).toBeGreaterThan(HATCH.z)
  })

  it('keeps the player in the corridor and lets them through the doorway and side room doors', () => {
    const boxes = collisionBoxes()
    const through = resolveCapsule({ x: 0, y: 0.2, z: 4.6 }, { x: 0, y: 0, z: -1 }, boxes)
    expect(through.vel.z).toBe(-1)
    const wall = resolveCapsule({ x: 0.9, y: 0.2, z: 4.6 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(wall.pos.z).toBeGreaterThanOrEqual(4.2)
    const side = resolveCapsule({ x: -1.0, y: 0.2, z: -1 }, { x: -3, y: 0, z: 0 }, boxes)
    expect(side.pos.x).toBeGreaterThanOrEqual(-0.9 - 1e-6)
    // Through the left store door at x -7.2..-8.4, z -6.8..-8.0.
    const door = resolveCapsule({ x: -6.5, y: 0.2, z: -7.4 }, { x: -3, y: 0, z: 0 }, boxes)
    expect(door.vel.x).toBe(-3)
    const intoLocker = resolveCapsule({ x: -6.0, y: 0.2, z: LOCKERS[0].center.z }, { x: 3, y: 0, z: 0 }, boxes)
    expect(intoLocker.pos.x).toBeLessThan(LOCKERS[0].center.x - 0.4)
  })

  it('stops at the cage door and the bars until the door is out', () => {
    const boxes = collisionBoxes()
    const bars = resolveCapsule({ x: 0.8, y: 0.2, z: CAGE.z + 0.5 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(bars.pos.z).toBeGreaterThan(CAGE.z)
    const door = resolveCapsule({ x: 0, y: 0.2, z: CAGE.z + 0.5 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(door.pos.z).toBeGreaterThan(CAGE.z)
    const open = boxes.filter((b) => JSON.stringify(b) !== JSON.stringify(cageDoorBox()))
    const free = resolveCapsule({ x: 0, y: 0.2, z: CAGE.z + 0.5 }, { x: 0, y: 0, z: -2 }, open)
    expect(free.vel.z).toBe(-2)
  })

  it('maps z to the checkpoint passed outbound and detects bumps', () => {
    expect(checkpointAt(-3)).toBeNull()
    expect(checkpointAt(-5)).toBe('wp0')
    expect(checkpointAt(-29)).toBe('wp1')
    expect(detectBump({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 })).toBe(true)
    expect(detectBump({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -0.9 })).toBe(false)
  })

  it('puts the locker eye 0.25 m behind the door face', () => {
    for (const l of LOCKERS) {
      const d = Math.hypot(l.doorPos.x - l.inside.x, l.doorPos.z - l.inside.z)
      expect(d).toBeCloseTo(0.25)
    }
  })

  it('has seven lockers, two door corners and four bags with distinct ids', () => {
    expect(LOCKERS).toHaveLength(7)
    expect(SPOTS.filter((s) => s.kind === 'corner')).toHaveLength(2)
    expect(SPOTS.filter((s) => s.kind === 'bag')).toHaveLength(4)
    expect(new Set(SPOTS.map((s) => s.id)).size).toBe(SPOTS.length)
  })

  it('gives the creature clear nodes, a closed patrol and an outside point for every spot', () => {
    for (const [name, p] of Object.entries(NAV_NODES)) {
      if (name === 'entry') continue
      expect(GRID.clearAt(p.x, p.z, CREATURE_RADIUS, creatureBlockers()), name).toBe(true)
    }
    for (let i = 0; i < PATROL_ROUTE.length; i++) {
      expect(creatureClear(PATROL_ROUTE[i], PATROL_ROUTE[(i + 1) % PATROL_ROUTE.length]), `leg ${i}`).toBe(true)
    }
    for (const s of SPOTS) expect(GRID.clearAt(s.outside.x, s.outside.z, CREATURE_RADIUS, creatureBlockers()), s.id).toBe(true)
  })

  it('never lets the creature walk straight past the hatch or across a wall corner', () => {
    expect(creatureClear(NAV_NODES.junction, NAV_NODES.approach)).toBe(false)
    expect(creatureClear(NAV_NODES.leftTop, NAV_NODES.leftStoreDoor)).toBe(false)
    expect(creatureClear(NAV_NODES.leftTop, NAV_NODES.leftBottom)).toBe(true)
  })

  it('puts every spot exit on free floor and every hiding spot inside the map', () => {
    const boxes = collisionBoxes()
    for (const s of SPOTS) {
      const out = resolveCapsule({ ...s.exit }, { x: 0, y: 0, z: 0 }, boxes)
      expect(out.pos.x, `${s.id} exit x`).toBeCloseTo(s.exit.x, 6)
      expect(out.pos.z, `${s.id} exit z`).toBeCloseTo(s.exit.z, 6)
      expect(GRID.openAt(s.exit.x, s.exit.z), `${s.id} exit in the map`).toBe(true)
    }
    for (const s of SPOTS.filter((q) => q.kind === 'corner')) expect(GRID.openAt(s.inside.x, s.inside.z)).toBe(true)
  })

  it('hides a door corner from the doorway: the leaf stands between them', () => {
    // Left store: door row z -6.8 to -8.0, pocket at z -8.6 behind the leaf at z -8.05.
    const c = SPOTS.find((s) => s.id === 'act3:corner0')
    expect(c).toBeDefined()
    const boxes = collisionBoxes()
    const walk = resolveCapsule({ x: -8.85, y: 0.2, z: -7.5 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(walk.pos.z).toBeGreaterThan(-8.1)
  })

  it('hangs Neil and Mike inside the cage room, apart, with room to turn', () => {
    for (const who of ['cdr', 'cmp'] as const) {
      const p = CAGED[who]
      expect(p.z).toBeLessThan(CAGE.z - 1)
      expect(p.z).toBeGreaterThan(CAGE.backZ + 1)
      expect(GRID.clearAt(p.x, p.z, 0.4)).toBe(true)
    }
    expect(CAGED.cmp.x - CAGED.cdr.x).toBeGreaterThan(0.9)
  })

  it('gives every solid prop on the map a collision box, so nothing can be walked through', () => {
    const boxes = collisionBoxes()
    for (const p of solidProps()) {
      const hit = boxes.some((b) => p.point.x > b.min.x && p.point.x < b.max.x && p.point.y > b.min.y && p.point.y < b.max.y && p.point.z > b.min.z && p.point.z < b.max.z)
      expect(hit, p.id).toBe(true)
    }
  })

  it('pushes the player out of a hanging crewman, at 0.55 m: close enough to take him', () => {
    const boxes = collisionBoxes()
    const hit = resolveCapsule({ x: 0.55, y: 0.2, z: CAGED.cmp.z + 0.4 }, { x: 0, y: 0, z: -2 }, boxes)
    expect(hit.pos.z).toBeGreaterThan(CAGED.cmp.z)
    expect(hit.pos.z - CAGED.cmp.z).toBeCloseTo(0.55, 1)
    expect(collisionBoxes(false)).not.toContainEqual(crewBox('cmp'))
  })

  it('puts the window in the junction wall, with a room behind it that no one can walk into', () => {
    const w = WINDOW
    expect(GRID.openAt(w.x, w.z + 0.2), 'the hall side is open').toBe(true)
    expect(GRID.openAt(w.x, w.z - 0.2), 'the far side is solid').toBe(false)
    expect(w.z).toBeLessThan(-4.4) // south of the wp0 line, in the junction hall
    expect(w.z).toBeGreaterThan(-6)
    const r = w.room
    for (let x = r.x0; x <= r.x1; x += 0.1) for (let z = r.z0; z <= r.z1 - 0.01; z += 0.1) expect(GRID.openAt(x, z), `${x.toFixed(1)},${z.toFixed(1)}`).toBe(false)
    for (const who of ['cdr', 'cmp'] as const) {
      expect(WINDOW_CREW[who].x).toBeGreaterThan(r.x0)
      expect(WINDOW_CREW[who].x).toBeLessThan(r.x1)
      expect(WINDOW_CREW[who].z).toBeGreaterThan(r.z0)
    }
    // The creature's route and nodes never touch the window room.
    for (const p of [...PATROL_ROUTE, ...Object.values(NAV_NODES)]) expect(p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1).toBe(false)
  })

  it('closes the window to the player: the wall boxes stand across the hole', () => {
    const boxes = collisionBoxes()
    const hit = resolveCapsule({ x: WINDOW.x, y: 0.2, z: WINDOW.z + 0.1 }, { x: 0, y: 0, z: -1 }, boxes)
    expect(hit.pos.z).toBeGreaterThanOrEqual(WINDOW.z + 0.3 - 1e-6)
  })
})

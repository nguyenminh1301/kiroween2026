// A small test world for the creature: a square ring corridor around a solid block, with a hiding spot
// in the west corridor. Used by the director tests only.
import { createNav, type Nav, type Pt } from './patrol'

export const BLOCK = { x0: 4, x1: 8, z0: 4, z1: 8 }
/** The hiding spot footprint in the west corridor. */
export const SPOT = { x0: 0, x1: 0.8, z0: 5.5, z1: 6.5 }
const SIZE = 12
const R = 0.35

const inside = (p: Pt, b: { x0: number; x1: number; z0: number; z1: number }, grow: number): boolean =>
  p.x > b.x0 - grow && p.x < b.x1 + grow && p.z > b.z0 - grow && p.z < b.z1 + grow

export const walkable = (p: Pt): boolean => p.x >= R && p.x <= SIZE - R && p.z >= R && p.z <= SIZE - R && !inside(p, BLOCK, R) && !inside(p, SPOT, R)

export function toyClear(a: Pt, b: Pt): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1))
  for (let i = 0; i <= n; i++) {
    const u = i / n
    if (!walkable({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u })) return false
  }
  return true
}

export function toyNav(): Nav {
  const nodes: Pt[] = [
    { x: 2, z: 2 },
    { x: 10, z: 2 },
    { x: 10, z: 10 },
    { x: 2, z: 10 },
    { x: 2, z: 6 },
    { x: 6, z: 2 },
    { x: 6, z: 10 },
    { x: 10, z: 6 },
  ]
  return createNav(nodes, toyClear, [nodes[0], nodes[1], nodes[2], nodes[3]], [nodes[4]])
}

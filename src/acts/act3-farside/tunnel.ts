// Builds the corridor shell, ribs, pipes and lockers as merged geometry. Three.js only, no React.
import type { BufferGeometry } from 'three'
import { BAYS, BAY_DEPTH, CHAMFER, DOORS, HALF_W, HEIGHT, LOCKERS, LOCKER_D, LOCKER_H, LOCKER_W, ROOM, Z_FAR_END, Z_HATCH_END, type Opening } from './layout'
import { cbox, ccyl, mergeColored, QuadBuilder, type P3 } from './geo'

export const SEG = 1.5
export const SEG_COUNT = Math.round((Z_HATCH_END - Z_FAR_END) / SEG)
const FLAT = HALF_W - CHAMFER

/** The octagon profile, going around from the floor left. */
export const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [-FLAT, 0],
  [FLAT, 0],
  [HALF_W, CHAMFER],
  [HALF_W, HEIGHT - CHAMFER],
  [FLAT, HEIGHT],
  [-FLAT, HEIGHT],
  [-HALF_W, HEIGHT - CHAMFER],
  [-HALF_W, CHAMFER],
]
const RIGHT_EDGES = [1, 2, 3]
const LEFT_EDGES = [5, 6, 7]

const segZ0 = (i: number): number => Z_HATCH_END - SEG * i
const isOpen = (i: number, list: Opening[]): boolean => list.some((o) => Math.abs(o.z1 - segZ0(i)) < 1e-6)

const SHADES = ['#9a6a5a', '#b8826c', '#7a4a3c', '#c89580', '#6a3a30']
const shade = (i: number, j: number): string => SHADES[(i * 3 + j * 5 + ((i * j) % 4)) % SHADES.length]

/** The tunnel walls, openings, bays and the side room. Inside faces, drawn double sided. */
export function buildShell(): BufferGeometry {
  const q = new QuadBuilder()
  const T = 1 / 1.5
  for (let i = 0; i < SEG_COUNT; i++) {
    const za = segZ0(i)
    const zb = za - SEG
    let u = 0
    for (let j = 0; j < 8; j++) {
      const [x0, y0] = PROFILE[j]
      const [x1, y1] = PROFILE[(j + 1) % 8]
      const len = Math.hypot(x1 - x0, y1 - y0)
      const skip = (RIGHT_EDGES.includes(j) && isOpen(i, DOORS)) || (LEFT_EDGES.includes(j) && isOpen(i, BAYS))
      if (!skip) {
        q.quad([x0, y0, za], [x1, y1, za], [x1, y1, zb], [x0, y0, zb], u * T, i * T, (u + len) * T, (i + 1) * T, shade(i, j))
      }
      u += len
    }
  }
  const wall = '#8a5a4a'
  // End caps.
  const ring = (z: number): P3[] => PROFILE.map(([x, y]) => [x, y, z] as P3)
  q.fan([0, HEIGHT / 2, Z_HATCH_END], ring(Z_HATCH_END), '#4a2a22')
  q.fan([0, HEIGHT / 2, Z_FAR_END], ring(Z_FAR_END), '#3a1a14')
  // Doorway and bay shells.
  for (const d of DOORS) {
    q.quad([FLAT, 0, d.z1], [ROOM.x0, 0, d.z1], [ROOM.x0, 0, d.z0], [FLAT, 0, d.z0], 0, 0, 0.6, 1, wall)
    q.quad([FLAT, HEIGHT, d.z1], [ROOM.x0, HEIGHT, d.z1], [ROOM.x0, HEIGHT, d.z0], [FLAT, HEIGHT, d.z0], 0, 0, 0.6, 1, wall)
    for (const z of [d.z0, d.z1]) {
      q.quad([HALF_W, 0, z], [ROOM.x0, 0, z], [ROOM.x0, HEIGHT, z], [HALF_W, HEIGHT, z], 0, 0, 0.3, 1, '#6a3a30')
    }
  }
  for (const b of BAYS) {
    q.quad([-FLAT, 0, b.z1], [-BAY_DEPTH, 0, b.z1], [-BAY_DEPTH, 0, b.z0], [-FLAT, 0, b.z0], 0, 0, 1, 1, wall)
    q.quad([-FLAT, HEIGHT, b.z1], [-BAY_DEPTH, HEIGHT, b.z1], [-BAY_DEPTH, HEIGHT, b.z0], [-FLAT, HEIGHT, b.z0], 0, 0, 1, 1, wall)
    q.quad([-BAY_DEPTH, 0, b.z1], [-BAY_DEPTH, HEIGHT, b.z1], [-BAY_DEPTH, HEIGHT, b.z0], [-BAY_DEPTH, 0, b.z0], 0, 0, 1, 1, '#5a2a22')
    for (const z of [b.z0, b.z1]) {
      q.quad([-HALF_W, 0, z], [-BAY_DEPTH, 0, z], [-BAY_DEPTH, HEIGHT, z], [-HALF_W, HEIGHT, z], 0, 0, 0.8, 1, '#6a3a30')
    }
  }
  // Side room: floor, ceiling, back, two end walls, front wall between the doorways.
  const { x0, x1, z0, z1 } = ROOM
  q.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], 0, 0, 2, 5, '#7a4a3c')
  q.quad([x0, HEIGHT, z1], [x1, HEIGHT, z1], [x1, HEIGHT, z0], [x0, HEIGHT, z0], 0, 0, 2, 5, '#5a2a22')
  q.quad([x1, 0, z1], [x1, 0, z0], [x1, HEIGHT, z0], [x1, HEIGHT, z1], 0, 0, 5, 1.5, '#8a5a4a')
  for (const z of [z0, z1]) q.quad([x0, 0, z], [x1, 0, z], [x1, HEIGHT, z], [x0, HEIGHT, z], 0, 0, 2, 1.5, '#7a4a3c')
  const gaps = [...DOORS].sort((a, b) => a.z0 - b.z0)
  let z = z0
  const front = (a: number, b: number): void => {
    if (b > a) q.quad([x0, 0, a], [x0, 0, b], [x0, HEIGHT, b], [x0, HEIGHT, a], 0, 0, (b - a) / 1.5, 1.5, '#7a4a3c')
  }
  for (const g of gaps) {
    front(z, g.z0)
    z = g.z1
  }
  front(z, z1)
  return q.build()
}

/** Ribs at the segment joints, skipped where an opening is. */
export function buildRibs(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const C = '#2a0f0b'
  const R = '#5a2214'
  for (let i = 0; i <= SEG_COUNT; i++) {
    const z = Z_HATCH_END - SEG * i
    const openR = isOpen(i, DOORS) || isOpen(i - 1, DOORS)
    const openL = isOpen(i, BAYS) || isOpen(i - 1, BAYS)
    const col = i % 2 ? C : R
    parts.push(cbox(2 * FLAT, 0.12, 0.12, col, 0, 0.06, z))
    parts.push(cbox(2 * FLAT, 0.12, 0.12, col, 0, HEIGHT - 0.06, z))
    if (!openR) parts.push(cbox(0.12, HEIGHT - 2 * CHAMFER, 0.12, col, HALF_W - 0.06, HEIGHT / 2, z))
    if (!openL) parts.push(cbox(0.12, HEIGHT - 2 * CHAMFER, 0.12, col, -HALF_W + 0.06, HEIGHT / 2, z))
  }
  return mergeColored(parts)
}

/** Cables and pipes along the upper corners, and the handrail bars. */
export function buildPipes(rails: Array<{ a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }>): BufferGeometry {
  const parts: BufferGeometry[] = []
  const len = Z_HATCH_END - Z_FAR_END
  const mid = (Z_HATCH_END + Z_FAR_END) / 2
  parts.push(ccyl(0.07, len, '#3a2a24', 0.95, 2.05, mid, 'z', 6))
  parts.push(ccyl(0.07, len, '#3a2a24', -0.95, 2.05, mid, 'z', 6))
  parts.push(ccyl(0.035, len, '#e9b740', 0.82, 2.2, mid, 'z', 4))
  parts.push(ccyl(0.035, len, '#6a6a60', -0.82, 2.2, mid, 'z', 4))
  parts.push(ccyl(0.025, len, '#15100e', 1.05, 1.9, mid, 'z', 4))
  parts.push(ccyl(0.025, len, '#15100e', -1.05, 1.9, mid, 'z', 4))
  for (const r of rails) {
    const zc = (r.a.z + r.b.z) / 2
    parts.push(ccyl(0.025, Math.abs(r.a.z - r.b.z), '#cfc7b4', r.a.x, r.a.y, zc, 'z', 6))
    const side = Math.sign(r.a.x)
    for (const z of [r.a.z, r.b.z]) parts.push(cbox(0.1, 0.03, 0.03, '#6a6558', r.a.x + side * 0.05, r.a.y, z))
  }
  return mergeColored(parts)
}

/** The stowage lockers: open-front frames with slatted doors. */
export function buildLockers(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const BODY = '#2e2c28'
  const DOOR = '#3a2e26'
  for (const l of LOCKERS) {
    const { x, z } = l.center
    const t = 0.04
    parts.push(cbox(t, LOCKER_H, LOCKER_D, BODY, x - LOCKER_W / 2 + t / 2, LOCKER_H / 2, z))
    parts.push(cbox(LOCKER_W, LOCKER_H, t, BODY, x, LOCKER_H / 2, z - LOCKER_D / 2 + t / 2))
    parts.push(cbox(LOCKER_W, LOCKER_H, t, BODY, x, LOCKER_H / 2, z + LOCKER_D / 2 - t / 2))
    parts.push(cbox(LOCKER_W, t, LOCKER_D, BODY, x, LOCKER_H - t / 2, z))
    parts.push(cbox(LOCKER_W, t, LOCKER_D, '#2a2622', x, t / 2, z))
    // Door frame and slats on the corridor face (x = center + W/2).
    const fx = x + LOCKER_W / 2
    parts.push(cbox(0.05, LOCKER_H, 0.06, DOOR, fx, LOCKER_H / 2, z - LOCKER_D / 2 + 0.03))
    parts.push(cbox(0.05, LOCKER_H, 0.06, DOOR, fx, LOCKER_H / 2, z + LOCKER_D / 2 - 0.03))
    for (let k = 0; k < 14; k++) {
      parts.push(cbox(0.03, 0.09, LOCKER_D - 0.1, k % 5 === 0 ? '#8e5a3c' : DOOR, fx, 0.2 + k * 0.13, z))
    }
    parts.push(cbox(0.06, 0.18, 0.06, '#c8bfa8', fx + 0.02, 1.0, z + 0.25))
  }
  return mergeColored(parts)
}

/** Door frame and the open hatch at the lander end. */
export function buildHatch(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const z = Z_HATCH_END - 0.06
  const y = 1.3
  const r = 0.62
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    parts.push(cbox(0.2, 0.1, 0.12, '#8a8272', Math.cos(a) * r, y + Math.sin(a) * r, z))
  }
  // The open door leaning to the side.
  parts.push(ccyl(0.45, 0.06, '#7a7262', 0.72, y, z - 0.3, 'z', 10))
  parts.push(cbox(0.14, 0.14, 0.1, '#b44a2e', 0.72, y, z - 0.37))
  return mergeColored(parts)
}

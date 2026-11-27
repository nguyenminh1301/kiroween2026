// Builds the dream map's shell, ribs, pipes, lockers, hatch, crew bays and the cage as merged
// geometry. Three.js only, no React.
import { Matrix4, type BufferGeometry } from 'three'
import {
  BAG_SPOTS,
  CABIN,
  CAGE,
  CAGED,
  DOORWAY,
  GRID,
  HALF_W,
  HATCH,
  HEIGHT,
  LOCKERS,
  LOCKER_D,
  LOCKER_H,
  LOCKER_W,
  WINDOW,
  WINDOW_CREW,
  Z_FAR_END,
  Z_HATCH_END,
  type LockerDef,
} from './layout'
import { cbox, ccyl, mergeColored, QuadBuilder } from './geo'
import { CELL } from './mapgrid'

const SHADES = ['#9a6a5a', '#b8826c', '#7a4a3c', '#c89580', '#6a3a30']
const shade = (i: number, j: number): string => SHADES[(i * 3 + j * 5 + ((i * j) % 4)) % SHADES.length]
const T = 1 / 1.5

/** Floors, ceilings and walls of the whole map. Inside faces, drawn double sided. */
export function buildShell(): BufferGeometry {
  const q = new QuadBuilder()
  for (const [c, r] of GRID.openCells()) {
    const x0 = GRID.colX0(c)
    const x1 = x0 + CELL
    const z1 = GRID.rowZ0(r)
    const z0 = z1 - CELL
    // Floor and ceiling.
    q.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], 0, 0, T * CELL, T * CELL, '#7a4a3c')
    q.quad([x0, HEIGHT, z1], [x1, HEIGHT, z1], [x1, HEIGHT, z0], [x0, HEIGHT, z0], 0, 0, T * CELL, T * CELL, '#5a2a22')
  }
  let i = 0
  for (const e of GRID.edges()) {
    i++
    // The wall at the cabin doorway belongs to `buildDoorway`.
    if (e.axis === 'z' && Math.abs(e.at - Z_HATCH_END) < 1e-6) continue
    const col = shade(i, Math.round(Math.abs(e.at) * 3))
    const len = e.to - e.from
    const w = WINDOW
    if (e.axis === 'z' && e.open === 1 && Math.abs(e.at - w.z) < 1e-6 && w.x - w.halfW >= e.from && w.x + w.halfW <= e.to) {
      // The wall with the window hole: four pieces round it.
      const piece = (xa: number, xb: number, ya: number, yb: number): void =>
        q.quad([xa, ya, e.at], [xb, ya, e.at], [xb, yb, e.at], [xa, yb, e.at], 0, 0, T * (xb - xa), T * (yb - ya), col)
      piece(e.from, w.x - w.halfW, 0, HEIGHT)
      piece(w.x + w.halfW, e.to, 0, HEIGHT)
      piece(w.x - w.halfW, w.x + w.halfW, 0, w.y0)
      piece(w.x - w.halfW, w.x + w.halfW, w.y1, HEIGHT)
      continue
    }
    if (e.axis === 'x') {
      q.quad([e.at, 0, e.to], [e.at, 0, e.from], [e.at, HEIGHT, e.from], [e.at, HEIGHT, e.to], 0, 0, T * len, T * HEIGHT, col)
    } else {
      q.quad([e.from, 0, e.at], [e.to, 0, e.at], [e.to, HEIGHT, e.at], [e.from, HEIGHT, e.at], 0, 0, T * len, T * HEIGHT, col)
    }
  }
  return q.build()
}

/** Ribs on the walls at every cell joint, and across the ceiling of long corridors. */
export function buildRibs(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const seen = new Set<string>()
  const C = '#2a0f0b'
  const R = '#5a2214'
  let k = 0
  for (const e of GRID.edges()) {
    // The closing wall at the cabin doorway has its own posts: a rib at its middle would stand in the doorway.
    if (e.axis === 'z' && Math.abs(e.at - Z_HATCH_END) < 1e-6) continue
    for (const end of [e.from, e.to]) {
      const key = `${e.axis}:${e.at.toFixed(2)}:${end.toFixed(2)}:${e.open}`
      if (seen.has(key)) continue
      seen.add(key)
      k++
      const col = k % 2 ? C : R
      const off = e.open * 0.06
      if (e.axis === 'x') parts.push(cbox(0.12, HEIGHT, 0.12, col, e.at + off, HEIGHT / 2, end))
      else parts.push(cbox(0.12, HEIGHT, 0.12, col, end, HEIGHT / 2, e.at + off))
    }
  }
  return mergeColored(parts)
}

/** Cables and pipes along the upper edge of every long wall. */
export function buildPipes(): BufferGeometry {
  const parts: BufferGeometry[] = []
  let k = 0
  for (const e of GRID.runs()) {
    const len = e.to - e.from
    if (len < 2.3) continue
    k++
    const mid = (e.from + e.to) / 2
    const off = e.open * 0.12
    const axis = e.axis === 'x' ? 'z' : 'x'
    const at = (d: number): [number, number] => [e.at + off + e.open * d, mid]
    const put = (r: number, color: string, y: number, d: number): void => {
      const [a, b] = at(d)
      parts.push(e.axis === 'x' ? ccyl(r, len, color, a, y, b, axis, 6) : ccyl(r, len, color, b, y, a, axis, 6))
    }
    put(0.07, '#3a2a24', 2.05, 0)
    if (k % 2) put(0.035, '#e9b740', 2.2, 0.05)
    else put(0.035, '#6a6a60', 2.2, 0.05)
    if (k % 3 === 0) put(0.025, '#15100e', 1.9, 0.02)
  }
  return mergeColored(parts)
}

const BODY = '#2e2c28'
const DOOR = '#3a2e26'
/** The locker built facing +x at the origin, then turned and moved. */
function lockerGeo(l: LockerDef): BufferGeometry {
  const parts: BufferGeometry[] = []
  const t = 0.04
  const y = LOCKER_H / 2
  // Local: the wall side is x = -W/2, the door face x = +W/2, depth along z.
  parts.push(cbox(t, LOCKER_H, LOCKER_D, BODY, -LOCKER_W / 2 + t / 2, y, 0))
  parts.push(cbox(LOCKER_W, LOCKER_H, t, BODY, 0, y, -LOCKER_D / 2 + t / 2))
  parts.push(cbox(LOCKER_W, LOCKER_H, t, BODY, 0, y, LOCKER_D / 2 - t / 2))
  parts.push(cbox(LOCKER_W, t, LOCKER_D, BODY, 0, LOCKER_H - t / 2, 0))
  parts.push(cbox(LOCKER_W, t, LOCKER_D, '#2a2622', 0, t / 2, 0))
  const fx = LOCKER_W / 2
  parts.push(cbox(0.05, LOCKER_H, 0.06, DOOR, fx, y, -LOCKER_D / 2 + 0.03))
  parts.push(cbox(0.05, LOCKER_H, 0.06, DOOR, fx, y, LOCKER_D / 2 - 0.03))
  // Slats 4.5 cm tall on a 14 cm pitch, so the gaps are clear.
  for (let k = 0; k < 13; k++) parts.push(cbox(0.03, 0.045, LOCKER_D - 0.1, k % 5 === 0 ? '#4a2c20' : '#1c1814', fx, 0.2 + k * 0.14, 0))
  parts.push(cbox(0.06, 0.18, 0.06, '#c8bfa8', fx + 0.02, 1.0, 0.25))
  const g = mergeColored(parts)
  const theta = { E: 0, W: Math.PI, N: Math.PI / 2, S: -Math.PI / 2 }[l.facing]
  g.applyMatrix4(new Matrix4().makeRotationY(theta))
  g.applyMatrix4(new Matrix4().makeTranslation(l.center.x, 0, l.center.z))
  return g
}

/** The stowage lockers: open-front frames with slatted doors. */
export function buildLockers(): BufferGeometry {
  return mergeColored(LOCKERS.map(lockerGeo))
}

/** The wall between the corridor and the cabin, with the doorway cut in it. */
export function buildDoorway(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const C = CABIN.halfW
  const z = Z_HATCH_END + 0.1
  const col = '#6a5a4c'
  parts.push(cbox(C - DOORWAY.halfW, HEIGHT, 0.2, col, -(C + DOORWAY.halfW) / 2, HEIGHT / 2, z))
  parts.push(cbox(C - DOORWAY.halfW, HEIGHT, 0.2, col, (C + DOORWAY.halfW) / 2, HEIGHT / 2, z))
  parts.push(cbox(2 * DOORWAY.halfW, HEIGHT - DOORWAY.h, 0.2, col, 0, (HEIGHT + DOORWAY.h) / 2, z))
  parts.push(cbox(0.08, DOORWAY.h, 0.24, '#8a8272', -DOORWAY.halfW, DOORWAY.h / 2, z))
  parts.push(cbox(0.08, DOORWAY.h, 0.24, '#8a8272', DOORWAY.halfW, DOORWAY.h / 2, z))
  parts.push(cbox(2 * DOORWAY.halfW + 0.08, 0.08, 0.24, '#8a8272', 0, DOORWAY.h, z))
  return mergeColored(parts)
}

/** The jammed hatch on the straight way: a steel slab with a wheel, a 6 cm gap under it. */
export function buildHatch(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const z = HATCH.z
  const w = HATCH.halfW * 2
  parts.push(cbox(w, HATCH.h - 0.06, HATCH.thick, '#4a3a30', 0, 0.06 + (HATCH.h - 0.06) / 2, z))
  parts.push(cbox(w, HEIGHT - HATCH.h, HATCH.thick + 0.1, '#3a2a24', 0, (HEIGHT + HATCH.h) / 2, z))
  parts.push(cbox(0.1, HATCH.h, HATCH.thick + 0.08, '#6a5a4c', -HATCH.halfW + 0.05, HATCH.h / 2, z))
  parts.push(cbox(0.1, HATCH.h, HATCH.thick + 0.08, '#6a5a4c', HATCH.halfW - 0.05, HATCH.h / 2, z))
  // Wheel and a dent from something that tried to push through.
  const zf = z + HATCH.thick / 2 + 0.04
  parts.push(ccyl(0.22, 0.04, '#7a6a58', 0, 1.2, zf, 'z', 10))
  parts.push(cbox(0.5, 0.05, 0.05, '#7a6a58', 0, 1.2, zf + 0.03))
  parts.push(cbox(0.05, 0.5, 0.05, '#7a6a58', 0, 1.2, zf + 0.03))
  parts.push(cbox(0.7, 0.35, 0.03, '#3a2e26', 0.4, 0.6, zf - 0.01))
  return mergeColored(parts)
}

/** The light under the hatch: a bright line at the gap and a warm spill on the floor. Unlit. */
export function buildHatchLight(): BufferGeometry {
  const q = new QuadBuilder()
  const z = HATCH.z + HATCH.thick / 2
  const y = 0.012
  const spill = (d0: number, d1: number, halfW: number, c: string): void =>
    q.quad([-halfW, y, z + d0], [halfW, y, z + d0], [halfW, y, z + d1], [-halfW, y, z + d1], 0, 0, 1, 1, c)
  spill(0, 0.12, 1.15, '#fff1d0')
  spill(0.12, 0.4, 1.0, '#c89a6a')
  spill(0.4, 0.9, 0.8, '#8a5a3c')
  spill(0.9, 1.6, 0.5, '#5a3426')
  // The gap itself, seen from the side.
  q.quad([-1.15, 0.0, z], [1.15, 0.0, z], [1.15, 0.06, z], [-1.15, 0.06, z], 0, 0, 1, 1, '#fff1d0')
  return q.build()
}

/** Empty sleeping bags standing against the walls of the crew bays, unzipped. */
export function buildBays(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const s of BAG_SPOTS) {
    const into = Math.sign(s.exit.x - s.usePos.x)
    const wall = s.usePos.x - into * 0.2
    const z = s.usePos.z
    const w = wall + into * 0.06
    parts.push(cbox(0.12, 1.5, 0.62, '#8c8a78', w, 1.0, z))
    parts.push(cbox(0.02, 1.35, 0.4, '#3a362c', w + into * 0.07, 1.0, z))
    parts.push(cbox(0.14, 0.16, 0.34, '#d9d2bf', w + into * 0.06, 1.6, z))
    parts.push(cbox(0.14, 0.06, 0.66, '#6d6a5a', w, 0.6, z))
    parts.push(cbox(0.14, 0.06, 0.66, '#6d6a5a', w, 1.2, z))
  }
  return mergeColored(parts)
}

const BAR = '#2a2622'
/** The cage bars across the approach, the two fixed slabs either side of the door, and the ceiling shackles. */
export function buildCage(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const z = CAGE.z
  for (const side of [-1, 1]) {
    for (let x = CAGE.doorHalf + 0.05; x < HALF_W + 0.02; x += 0.14) parts.push(cbox(0.04, HEIGHT, 0.04, BAR, side * x, HEIGHT / 2, z))
  }
  parts.push(cbox(2 * HALF_W, 0.05, 0.05, BAR, 0, 0.5, z))
  parts.push(cbox(2 * HALF_W, 0.05, 0.05, BAR, 0, 1.3, z))
  parts.push(cbox(2 * HALF_W, 0.05, 0.05, BAR, 0, HEIGHT - 0.05, z))
  // Ceiling rail and hooks the crew hang from.
  parts.push(cbox(2 * HALF_W - 0.1, 0.06, 0.08, '#3a342c', 0, HEIGHT - 0.04, CAGED.cdr.z))
  for (const who of ['cdr', 'cmp'] as const) {
    parts.push(cbox(0.1, 0.1, 0.1, '#6a6558', CAGED[who].x, HEIGHT - 0.09, CAGED[who].z))
  }
  return mergeColored(parts)
}

/** The cage door, built around a hinge at x = 0 so it can swing about its own origin. Centre it at x = -doorHalf. */
export function buildCageDoor(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const w = CAGE.doorHalf * 2
  for (let x = 0.04; x < w; x += 0.12) parts.push(cbox(0.04, HEIGHT, 0.04, BAR, x, HEIGHT / 2, 0))
  parts.push(cbox(w, 0.05, 0.05, BAR, w / 2, 0.5, 0))
  parts.push(cbox(w, 0.05, 0.05, BAR, w / 2, 1.3, 0))
  parts.push(cbox(w, 0.05, 0.05, BAR, w / 2, HEIGHT - 0.05, 0))
  return mergeColored(parts)
}

/** Dark blood on the floor under the crew and on the walls behind them. Unlit, a hair off the surface. */
export function buildBlood(): BufferGeometry {
  const q = new QuadBuilder()
  const fl = (x: number, z: number, w: number, d: number, c: string): void =>
    q.quad([x - w / 2, 0.012, z + d / 2], [x + w / 2, 0.012, z + d / 2], [x + w / 2, 0.012, z - d / 2], [x - w / 2, 0.012, z - d / 2], 0, 0, 1, 1, c)
  const backZ = Z_FAR_END + 0.012
  const wall = (x: number, y0: number, y1: number, w: number, c: string): void =>
    q.quad([x - w / 2, y0, backZ], [x + w / 2, y0, backZ], [x + w / 2, y1, backZ], [x - w / 2, y1, backZ], 0, 0, 1, 1, c)
  const side = (sx: -1 | 1, z: number, y0: number, y1: number, w: number, c: string): void => {
    const x = sx * (HALF_W - 0.012)
    q.quad([x, y0, z - w / 2], [x, y0, z + w / 2], [x, y1, z + w / 2], [x, y1, z - w / 2], 0, 0, 1, 1, c)
  }
  for (const who of ['cdr', 'cmp'] as const) {
    const { x, z } = CAGED[who]
    fl(x, z, 0.9, 0.8, '#2a0707')
    fl(x + 0.25, z + 0.35, 0.5, 0.3, '#1c0505')
    fl(x - 0.3, z - 0.3, 0.3, 0.5, '#3a0a0a')
  }
  fl(0, CAGED.cdr.z + 0.6, 1.4, 0.35, '#2a0707')
  // Smears down the back wall and the side walls, longest below the hooks.
  wall(-0.6, 0.05, 1.7, 0.22, '#3a0a0a')
  wall(-0.35, 0.05, 1.1, 0.14, '#2a0707')
  wall(0.5, 0.05, 1.9, 0.26, '#3a0a0a')
  wall(0.8, 0.05, 0.9, 0.12, '#2a0707')
  wall(0.0, 0.05, 0.5, 0.4, '#1c0505')
  side(-1, CAGED.cdr.z, 0.1, 1.3, 0.3, '#3a0a0a')
  side(1, CAGED.cmp.z + 0.2, 0.1, 1.6, 0.26, '#3a0a0a')
  side(-1, CAGED.cdr.z - 0.5, 0.05, 0.7, 0.16, '#2a0707')
  return q.build()
}

export interface StripSpot {
  x: number
  z: number
  /** The strip runs along z (a wall facing east or west). */
  alongZ: boolean
}

/** One floor strip per cell along every long wall, 0.3 m from the wall. */
export function stripSpots(): StripSpot[] {
  const out: StripSpot[] = []
  for (const e of GRID.runs()) {
    if (e.to - e.from < 2.3) continue
    for (let a = e.from + CELL / 2; a < e.to; a += CELL) {
      const off = e.at + e.open * 0.3
      out.push(e.axis === 'x' ? { x: off, z: a, alongZ: true } : { x: a, z: off, alongZ: false })
    }
  }
  return out
}

const FRAME = '#6a5a4c'
/** The window: a frame and two bars on the hall side, and the room behind it (floor, ceiling, walls, hooks). */
export function buildWindow(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const w = WINDOW
  const r = w.room
  const zf = w.z + 0.05
  const hw = w.halfW
  const h = w.y1 - w.y0
  const yc = (w.y0 + w.y1) / 2
  // Frame and grille.
  parts.push(cbox(2 * hw + 0.16, 0.08, 0.1, FRAME, w.x, w.y1 + 0.04, zf))
  parts.push(cbox(2 * hw + 0.16, 0.08, 0.1, FRAME, w.x, w.y0 - 0.04, zf))
  parts.push(cbox(0.08, h, 0.1, FRAME, w.x - hw - 0.04, yc, zf))
  parts.push(cbox(0.08, h, 0.1, FRAME, w.x + hw + 0.04, yc, zf))
  for (const dx of [-0.15, 0.15]) parts.push(cbox(0.03, h, 0.03, '#2a2622', w.x + dx, yc, w.z + 0.02))
  // The room: slabs just outside its volume so the inside faces show.
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  const dx = r.x1 - r.x0
  const dz = r.z1 - r.z0
  parts.push(cbox(dx, 0.1, dz, '#4a2a22', cx, -0.05, cz))
  parts.push(cbox(dx, 0.1, dz, '#3a1a14', cx, HEIGHT + 0.05, cz))
  parts.push(cbox(dx, HEIGHT, 0.1, '#5a2a1c', cx, HEIGHT / 2, r.z0 - 0.05))
  parts.push(cbox(0.1, HEIGHT, dz, '#4a2218', r.x0 - 0.05, HEIGHT / 2, cz))
  parts.push(cbox(0.1, HEIGHT, dz, '#4a2218', r.x1 + 0.05, HEIGHT / 2, cz))
  parts.push(cbox(dx - 0.2, 0.06, 0.08, '#3a342c', cx, HEIGHT - 0.04, WINDOW_CREW.cdr.z))
  for (const who of ['cdr', 'cmp'] as const) parts.push(cbox(0.1, 0.1, 0.1, '#6a6558', WINDOW_CREW[who].x, HEIGHT - 0.09, WINDOW_CREW[who].z))
  return mergeColored(parts)
}

/** The weak light of the window room: a dim lamp on the ceiling, a warm wash on the back wall and a pool on the floor. Unlit. */
export function buildWindowGlow(): BufferGeometry {
  const q = new QuadBuilder()
  const r = WINDOW.room
  const cx = (r.x0 + r.x1) / 2
  const lampY = HEIGHT - 0.02
  q.quad([cx - 0.3, lampY, -6.9], [cx + 0.3, lampY, -6.9], [cx + 0.3, lampY, -7.3], [cx - 0.3, lampY, -7.3], 0, 0, 1, 1, '#b08a5a')
  const wz = r.z0 + 0.012
  q.quad([cx - 1.0, 0.15, wz], [cx + 1.0, 0.15, wz], [cx + 1.0, 1.9, wz], [cx - 1.0, 1.9, wz], 0, 0, 1, 1, '#3a2216')
  q.quad([cx - 0.6, 0.45, wz + 0.002], [cx + 0.6, 0.45, wz + 0.002], [cx + 0.6, 1.5, wz + 0.002], [cx - 0.6, 1.5, wz + 0.002], 0, 0, 1, 1, '#4a2c1a')
  const y = 0.012
  q.quad([cx - 1.0, y, -6.2], [cx + 1.0, y, -6.2], [cx + 1.0, y, -8.0], [cx - 1.0, y, -8.0], 0, 0, 1, 1, '#2a1610')
  return q.build()
}

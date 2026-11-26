// The act 3 dream map as a grid of 1.2 m cells. Walls, collision, floor and creature clearance all come
// from the same cells. Pure: no Three.js or React imports.
import type { Box } from '../../engine/collision'

export const CELL = 1.2
/** Inclusive cell ranges: columns c0..c1, rows r0..r1. */
export interface Rect {
  c0: number
  r0: number
  c1: number
  r1: number
}
export interface Pt {
  x: number
  z: number
}

/** A wall edge between an open cell and a solid one. `axis` is the axis the wall plane is fixed on. */
export interface WallEdge {
  axis: 'x' | 'z'
  /** The fixed coordinate of the plane. */
  at: number
  /** Start and end along the other axis (from < to). */
  from: number
  to: number
  /** Which way the open cell lies: +1 or -1 along `axis`. */
  open: 1 | -1
}

export class Grid {
  private readonly cells: Set<number>
  constructor(
    readonly rects: Rect[],
    /** The column whose left edge is x = 0. */
    private readonly colOrigin: number,
    /** World z of the top edge of row 0. */
    readonly zTop: number,
    readonly cols: number,
    readonly rows: number,
  ) {
    this.cells = new Set()
    for (const r of rects) for (let c = r.c0; c <= r.c1; c++) for (let q = r.r0; q <= r.r1; q++) this.cells.add(this.key(c, q))
  }

  private key(c: number, r: number): number {
    return r * 1000 + c
  }
  /** Left edge x of column c. */
  colX0 = (c: number): number => (c - this.colOrigin) * CELL
  /** Top edge z of row r (the larger z). */
  rowZ0 = (r: number): number => this.zTop - r * CELL
  open(c: number, r: number): boolean {
    return this.cells.has(this.key(c, r))
  }
  cellOf(x: number, z: number): [number, number] {
    return [Math.floor(x / CELL) + this.colOrigin, Math.floor((this.zTop - z) / CELL)]
  }
  /** The point is inside an open cell. */
  openAt(x: number, z: number): boolean {
    const [c, r] = this.cellOf(x, z)
    return this.open(c, r)
  }
  /** Centre of a cell. */
  center(c: number, r: number): Pt {
    return { x: this.colX0(c) + CELL / 2, z: this.rowZ0(r) - CELL / 2 }
  }
  /** All open cells, row by row. */
  openCells(): Array<[number, number]> {
    const out: Array<[number, number]> = []
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.open(c, r)) out.push([c, r])
    return out
  }

  /** Every wall edge, one per cell side. */
  edges(): WallEdge[] {
    const out: WallEdge[] = []
    for (const [c, r] of this.openCells()) {
      const x0 = this.colX0(c)
      const x1 = x0 + CELL
      const zt = this.rowZ0(r)
      const zb = zt - CELL
      if (!this.open(c - 1, r)) out.push({ axis: 'x', at: x0, from: zb, to: zt, open: 1 })
      if (!this.open(c + 1, r)) out.push({ axis: 'x', at: x1, from: zb, to: zt, open: -1 })
      if (!this.open(c, r - 1)) out.push({ axis: 'z', at: zt, from: x0, to: x1, open: -1 })
      if (!this.open(c, r + 1)) out.push({ axis: 'z', at: zb, from: x0, to: x1, open: 1 })
    }
    return out
  }

  /** Wall edges merged into runs, for collision. */
  runs(): WallEdge[] {
    const groups = new Map<string, WallEdge[]>()
    for (const e of this.edges()) {
      const k = `${e.axis}:${e.at.toFixed(3)}:${e.open}`
      const g = groups.get(k)
      if (g) g.push(e)
      else groups.set(k, [e])
    }
    const out: WallEdge[] = []
    for (const g of groups.values()) {
      g.sort((a, b) => a.from - b.from)
      let cur = { ...g[0] }
      for (const e of g.slice(1)) {
        if (Math.abs(e.from - cur.to) < 1e-6) cur.to = e.to
        else {
          out.push(cur)
          cur = { ...e }
        }
      }
      out.push(cur)
    }
    return out
  }

  /** Collision boxes for the walls (0.6 m thick, outward) and the floor and ceiling slabs. */
  wallBoxes(height: number): Box[] {
    const T = 0.6
    return this.runs().map((e) => {
      const lo = e.open === 1 ? e.at - T : e.at
      const hi = e.open === 1 ? e.at : e.at + T
      return e.axis === 'x'
        ? { min: { x: lo, y: 0, z: e.from }, max: { x: hi, y: height, z: e.to } }
        : { min: { x: e.from, y: 0, z: lo }, max: { x: e.to, y: height, z: hi } }
    })
  }

  /** All eight points on a circle of `radius` around (x, z) and the centre are in open cells and outside `blocked`. */
  clearAt(x: number, z: number, radius: number, blocked: Box[] = []): boolean {
    for (let i = -1; i < 8; i++) {
      const px = i < 0 ? x : x + Math.cos((i * Math.PI) / 4) * radius
      const pz = i < 0 ? z : z + Math.sin((i * Math.PI) / 4) * radius
      if (!this.openAt(px, pz)) return false
      for (const b of blocked) if (px > b.min.x && px < b.max.x && pz > b.min.z && pz < b.max.z) return false
    }
    return true
  }

  /** A straight walk from a to b keeps `radius` clear of every wall and blocker. */
  lineClear(a: Pt, b: Pt, radius: number, blocked: Box[] = []): boolean {
    const d = Math.hypot(b.x - a.x, b.z - a.z)
    const n = Math.max(1, Math.ceil(d / 0.1))
    for (let i = 0; i <= n; i++) {
      const u = i / n
      if (!this.clearAt(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u, radius, blocked)) return false
    }
    return true
  }
}

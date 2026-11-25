// Moon terrain: a 120 m height field of rolling regolith, craters, three pits and flat zones.
// Pure: no Three.js or React imports. `groundAt` reads the same grid the mesh is built from.
import { createRng } from '../../procgen/rng'

export const SIZE = 120
export const CELLS = 80
export const SEED = 9
export const CELL = SIZE / CELLS
const HALF = SIZE / 2

export interface Pit {
  x: number
  z: number
  r: number
}

export const PIT_RADIUS = 2.4
export const PITS: readonly Pit[] = [
  { x: -3, z: 18, r: PIT_RADIUS },
  { x: 17.5, z: 8.5, r: PIT_RADIUS },
  { x: -15.5, z: -9.7, r: PIT_RADIUS },
]
const PIT_DEPTH = 1.1
const PIT_RIM = 0.35

export const SITES = {
  flag: { x: -1.5, z: 9 },
  sample: { x: 9, z: 4.5 },
  seismo: { x: -8, z: -5 },
} as const

/** Flat zones: height is exactly 0 inside `inner`, blends to raw terrain by `outer`. */
const ZONES = [
  { x: 0, z: 0, inner: 6, outer: 10 },
  { x: SITES.flag.x, z: SITES.flag.z, inner: 2, outer: 6 },
  { x: SITES.sample.x, z: SITES.sample.z, inner: 2, outer: 6 },
  { x: SITES.seismo.x, z: SITES.seismo.z, inner: 2, outer: 6 },
] as const

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** Bowl inside `r`, raised rim just outside, falling away to 0 at 1.45 r. */
export function craterProfile(d: number, r: number, depth: number, rim: number): number {
  if (d >= r * 1.45) return 0
  if (d < r) {
    const q = d / r
    return -depth + (depth + rim) * q * q
  }
  const t = (d - r) / (r * 0.45)
  return rim * (1 - t) * (1 - t)
}

interface Crater {
  x: number
  z: number
  r: number
  depth: number
  rim: number
}

function lattice(seed: number, cell: number): (x: number, z: number) => number {
  const rng = createRng(seed)
  const n = Math.ceil(SIZE / cell) + 3
  const v = Array.from({ length: n * n }, () => rng() * 2 - 1)
  return (x, z) => {
    const fx = (x + HALF) / cell + 1
    const fz = (z + HALF) / cell + 1
    const ix = Math.floor(fx)
    const iz = Math.floor(fz)
    const tx = smooth(fx - ix)
    const tz = smooth(fz - iz)
    const at = (a: number, b: number): number => v[Math.min(n - 1, Math.max(0, b)) * n + Math.min(n - 1, Math.max(0, a))]
    const top = at(ix, iz) * (1 - tx) + at(ix + 1, iz) * tx
    const bot = at(ix, iz + 1) * (1 - tx) + at(ix + 1, iz + 1) * tx
    return top * (1 - tz) + bot * tz
  }
}

let built: { craters: Crater[]; big: (x: number, z: number) => number; small: (x: number, z: number) => number } | null = null

function parts() {
  if (built) return built
  const rng = createRng(SEED)
  const craters: Crater[] = []
  for (let tries = 0; craters.length < 46 && tries < 400; tries++) {
    const r = 2.5 + rng() * rng() * 7
    const x = (rng() * 2 - 1) * (HALF - 4)
    const z = (rng() * 2 - 1) * (HALF - 4)
    const depth = r * (0.05 + rng() * 0.06)
    if (PITS.some((p) => Math.hypot(p.x - x, p.z - z) < p.r * 1.45 + r * 1.45 + 1)) continue
    craters.push({ x, z, r, depth, rim: depth * 0.35 })
  }
  built = { craters, big: lattice(SEED + 1, 18), small: lattice(SEED + 2, 6) }
  return built
}

/** The craters (not the pits), for the scene. */
export const craters = (): readonly Crater[] => parts().craters

function rawHeight(x: number, z: number): number {
  const p = parts()
  let h = p.big(x, z) * 0.7 + p.small(x, z) * 0.22
  for (const c of p.craters) {
    const d = Math.hypot(x - c.x, z - c.z)
    if (d < c.r * 1.45) h += craterProfile(d, c.r, c.depth, c.rim)
  }
  for (const pit of PITS) {
    const d = Math.hypot(x - pit.x, z - pit.z)
    if (d < pit.r * 1.45) h += craterProfile(d, pit.r, PIT_DEPTH, PIT_RIM)
  }
  return h
}

/** The terrain function before sampling to the grid. 0 inside the flat zones. */
export function heightFn(x: number, z: number): number {
  let w = 1
  for (const zn of ZONES) {
    const d = Math.hypot(x - zn.x, z - zn.z)
    w = Math.min(w, smooth((d - zn.inner) / (zn.outer - zn.inner)))
  }
  return w === 0 ? 0 : rawHeight(x, z) * w
}

let grid: Float32Array | null = null

/** Grid heights, (CELLS + 1)^2, row by row from z = -60. */
export function heightGrid(): Float32Array {
  if (grid) return grid
  const n = CELLS + 1
  const g = new Float32Array(n * n)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) g[j * n + i] = heightFn(-HALF + i * CELL, -HALF + j * CELL)
  grid = g
  return g
}

/** Ground height at (x, z) for walking and placing. Bilinear on the mesh grid, held at the edge. */
export function groundAt(x: number, z: number): number {
  const g = heightGrid()
  const n = CELLS + 1
  const fx = Math.min(CELLS, Math.max(0, (x + HALF) / CELL))
  const fz = Math.min(CELLS, Math.max(0, (z + HALF) / CELL))
  const i = Math.min(CELLS - 1, Math.floor(fx))
  const j = Math.min(CELLS - 1, Math.floor(fz))
  const tx = fx - i
  const tz = fz - j
  const a = g[j * n + i] * (1 - tx) + g[j * n + i + 1] * tx
  const b = g[(j + 1) * n + i] * (1 - tx) + g[(j + 1) * n + i + 1] * tx
  return a * (1 - tz) + b * tz
}

export interface Rock {
  x: number
  z: number
  size: number
  yaw: number
  tilt: number
}

/** Scattered angular rocks, kept off the lander, the sites and the pits. */
export function rocks(count = 90): Rock[] {
  const rng = createRng(SEED + 3)
  const out: Rock[] = []
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const x = (rng() * 2 - 1) * (HALF - 2)
    const z = (rng() * 2 - 1) * (HALF - 2)
    const size = 0.12 + rng() * rng() * 0.9
    const yaw = rng() * Math.PI * 2
    const tilt = (rng() - 0.5) * 0.6
    if (Math.hypot(x, z) < 6) continue
    if (Object.values(SITES).some((s) => Math.hypot(x - s.x, z - s.z) < 2.5)) continue
    if (PITS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r * 1.5)) continue
    out.push({ x, z, size, yaw, tilt })
  }
  return out
}

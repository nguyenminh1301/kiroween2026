// Moon terrain: a 198 m detailed height field of rolling regolith, craters, three pits and flat zones,
// and a far field out to 2.5 km that falls away with the Moon's curve. The far rings are built in terrainGeo.
// Pure: no Three.js or React imports. `groundAt` reads the same grid the mesh is built from.
import { createRng } from '../../procgen/rng'

export const SIZE = 198
export const CELLS = 132
export const SEED = 9
export const CELL = SIZE / CELLS
export const HALF = SIZE / 2
/** Moon radius in metres, for the horizon drop. */
export const MOON_RADIUS = 1737400
/** The far field ends here. */
export const FAR_EDGE = 2500
/** The player stays inside this radius (soft limit). */
export const WALK_LIMIT = 80
/** How far the sea of terrain drops below the flat plane at distance sq. */
export const curveDrop = (x: number, z: number): number => (x * x + z * z) / (2 * MOON_RADIUS)

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

function hash(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1103515245)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return ((h >>> 0) / 4294967296) * 2 - 1
}

/** Smooth value noise on an infinite lattice with `cell` metres between points. Range about -1 to 1. */
function lattice(seed: number, cell: number): (x: number, z: number) => number {
  return (x, z) => {
    const fx = x / cell
    const fz = z / cell
    const ix = Math.floor(fx)
    const iz = Math.floor(fz)
    const tx = smooth(fx - ix)
    const tz = smooth(fz - iz)
    const top = hash(ix, iz, seed) * (1 - tx) + hash(ix + 1, iz, seed) * tx
    const bot = hash(ix, iz + 1, seed) * (1 - tx) + hash(ix + 1, iz + 1, seed) * tx
    return top * (1 - tz) + bot * tz
  }
}

let built: { craters: Crater[]; big: (x: number, z: number) => number; small: (x: number, z: number) => number } | null = null

function parts() {
  if (built) return built
  const rng = createRng(SEED)
  const craters: Crater[] = []
  for (let tries = 0; craters.length < 125 && tries < 900; tries++) {
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
  // The fine noise fades out past the detailed area: far away the far field takes over.
  const fine = 1 - smooth((Math.hypot(x, z) - 120) / 200)
  let h = fine === 0 ? 0 : (p.big(x, z) * 0.7 + p.small(x, z) * 0.22) * fine
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

const smoothstep = smooth

/** Craters beyond the detailed area. Few, and bigger the farther they are. */
let farList: Crater[] | null = null
export function farCraters(): readonly Crater[] {
  if (farList) return farList
  const rng = createRng(SEED + 7)
  const out: Crater[] = []
  for (let i = 0; i < 80; i++) {
    // Log-uniform distance: dense near the edge of the detailed area, sparse far out.
    const base = HALF + 12
    const d = base * Math.exp(rng() * Math.log((FAR_EDGE - 400) / base))
    const a = rng() * Math.PI * 2
    const r = 8 + d * (0.025 + rng() * 0.05)
    const depth = r * (0.05 + rng() * 0.05)
    out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r, depth, rim: depth * 0.35 })
  }
  farList = out
  return out
}

let farNoise: { hills: (x: number, z: number) => number; swell: (x: number, z: number) => number } | null = null

/** The far terms: low hills and big craters, fading in past 90 m and out toward the 2.5 km edge. */
export function farHeight(x: number, z: number): number {
  const d = Math.hypot(x, z)
  const fadeIn = smoothstep((d - 90) / 220)
  if (fadeIn === 0) return 0
  const fadeOut = 1 - smoothstep((d - 1700) / 800)
  if (!farNoise) farNoise = { hills: lattice(SEED + 4, 170), swell: lattice(SEED + 5, 700) }
  let h = farNoise.hills(x, z) * 2.2 + farNoise.swell(x, z) * 16
  for (const c of farCraters()) {
    const dc = Math.hypot(x - c.x, z - c.z)
    if (dc < c.r * 1.45) h += craterProfile(dc, c.r, c.depth, c.rim)
  }
  return h * fadeIn * fadeOut
}

/** Height of the surface at any (x, z): near terrain plus the far terms. No curve drop. */
export const terrainHeight = (x: number, z: number): number => heightFn(x, z) + farHeight(x, z)

let grid: Float32Array | null = null

/** Grid heights, (CELLS + 1)^2, row by row from z = -60. */
export function heightGrid(): Float32Array {
  if (grid) return grid
  const n = CELLS + 1
  const g = new Float32Array(n * n)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) g[j * n + i] = terrainHeight(-HALF + i * CELL, -HALF + j * CELL)
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

/** Surface height anywhere: the grid inside it, the far field with the curve drop outside. */
export function surfaceAt(x: number, z: number): number {
  if (Math.abs(x) <= HALF && Math.abs(z) <= HALF) return groundAt(x, z)
  return terrainHeight(x, z) - curveDrop(x, z)
}

export interface Rock {
  x: number
  z: number
  size: number
  yaw: number
  tilt: number
}

/**
 * Scattered angular rocks, kept off the lander, the sites and the pits. Dense near the lander and sparse
 * far out, and bigger with distance so they still read.
 */
export function rocks(count = 360): Rock[] {
  const rng = createRng(SEED + 3)
  const out: Rock[] = []
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const u = rng()
    const d = 6 + u * u * u * 1400
    const a = rng() * Math.PI * 2
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    const size = (0.12 + rng() * rng() * 0.9) * (1 + d / 90)
    const yaw = rng() * Math.PI * 2
    const tilt = (rng() - 0.5) * 0.6
    if (d < 6) continue
    if (Object.values(SITES).some((s) => Math.hypot(x - s.x, z - s.z) < 2.5)) continue
    if (PITS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r * 1.5)) continue
    out.push({ x, z, size, yaw, tilt })
  }
  return out
}

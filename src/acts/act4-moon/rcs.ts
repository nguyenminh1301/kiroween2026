// Reaction control puffs: four clusters on the corners of the ascent stage, each with a sideways and an up/down
// thruster. A puff is a short flash, 0.1 to 0.3 s, now and then. Pure: no Three.js or React imports.
import type { Vec3 } from '../../types'

export const RCS_CLUSTERS: readonly { x: number; z: number }[] = [
  { x: 1.5, z: 0.9 },
  { x: -1.5, z: 0.9 },
  { x: 1.5, z: -0.9 },
  { x: -1.5, z: -0.9 },
]
/** Two thrusters per cluster: 0 sideways (outward in x), 1 vertical. */
export const RCS_COUNT = RCS_CLUSTERS.length * 2
export const RCS_Y = 3.9
export const PUFF_MIN = 0.1
export const PUFF_MAX = 0.3

const hash = (i: number, k: number, j: number): number => {
  const x = Math.sin(i * 127.1 + k * 311.7 + j * 74.7) * 43758.5453
  return x - Math.floor(x)
}

/** Length of one slot at a firing rate of 1: each thruster gets at most one puff per slot. */
export const SLOT = 1.4

export interface Puff {
  start: number
  duration: number
}

/** The puff of thruster `i` in slot `k`, or null when it stays quiet. `rate` above 1 fires more often. */
export function puffIn(i: number, k: number, rate = 1): Puff | null {
  const slot = SLOT / rate
  if (hash(i, k, 1) > 0.55) return null
  const duration = PUFF_MIN + (PUFF_MAX - PUFF_MIN) * hash(i, k, 2)
  return { start: k * slot + hash(i, k, 3) * (slot - PUFF_MAX), duration }
}

/** 1 while thruster `i` is firing at time `t`, fading to 0.4 at the end of the puff; 0 when quiet. */
export function rcsFlash(i: number, t: number, rate = 1): number {
  if (t < 0) return 0
  const k = Math.floor(t / (SLOT / rate))
  const p = puffIn(i, k, rate)
  if (!p || t < p.start || t >= p.start + p.duration) return 0
  return 1 - 0.6 * ((t - p.start) / p.duration)
}

/** Where thruster `i` sits, and which way its puff points (unit vector). */
export function rcsMount(i: number): { pos: Vec3; dir: Vec3 } {
  const c = RCS_CLUSTERS[Math.floor(i / 2)]
  const vertical = i % 2 === 1
  const sx = Math.sign(c.x)
  const sz = Math.sign(c.z)
  if (!vertical) return { pos: { x: c.x + sx * 0.15, y: RCS_Y, z: c.z }, dir: { x: sx, y: 0, z: 0 } }
  // Up on the front clusters, down on the rear ones: the stage pitches and climbs.
  return { pos: { x: c.x, y: RCS_Y + (sz > 0 ? 0.15 : -0.15), z: c.z }, dir: { x: 0, y: sz > 0 ? 1 : -1, z: 0 } }
}

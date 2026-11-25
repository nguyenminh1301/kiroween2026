// The act 4 creature: it climbs out of a pit, stands at the rim, then chases the player in a straight line.
// Pure: no Three.js or React imports. Heading uses the yaw convention (0 faces -z, positive turns left).
import type { Pit } from './terrain'

export const RISE_SECONDS = 2.2
export const RIM_SECONDS = 1.4
export const CHASE_SPEED = 1.8
export const CATCH_RANGE = 1.0
/** How far below the ground it starts, in metres. */
export const RISE_DEPTH = 1.8

export type Phase = 'rising' | 'rim' | 'chase'
export interface Pt {
  x: number
  z: number
}

export interface Emerged {
  phase: Phase
  /** Seconds in the current phase. */
  time: number
  x: number
  z: number
  heading: number
  /** Metres below the ground it still is, 1.8 to 0. */
  depth: number
  readonly center: Pt
  readonly rim: Pt
}

export const headingTo = (a: Pt, b: Pt): number => Math.atan2(-(b.x - a.x), -(b.z - a.z))

/** The creature at the bottom of `pit`, about to climb toward `toward` (the lander side). */
export function createEmerged(pit: Pit, toward: Pt): Emerged {
  const dx = toward.x - pit.x
  const dz = toward.z - pit.z
  const len = Math.hypot(dx, dz) || 1
  const rim = { x: pit.x + (dx / len) * pit.r, z: pit.z + (dz / len) * pit.r }
  return {
    phase: 'rising',
    time: 0,
    x: pit.x,
    z: pit.z,
    heading: headingTo({ x: pit.x, z: pit.z }, rim),
    depth: RISE_DEPTH,
    center: { x: pit.x, z: pit.z },
    rim,
  }
}

/** Move one step. Returns true when the player is caught (only in the chase). Mutates `c`. */
export function stepEmerged(c: Emerged, dt: number, player: Pt): boolean {
  if (!(dt > 0)) return false
  c.time += dt
  if (c.phase === 'rising') {
    const u = Math.min(1, c.time / RISE_SECONDS)
    c.x = c.center.x + (c.rim.x - c.center.x) * u
    c.z = c.center.z + (c.rim.z - c.center.z) * u
    c.depth = RISE_DEPTH * (1 - u)
    if (u >= 1) {
      c.phase = 'rim'
      c.time = 0
    }
    return false
  }
  c.heading = headingTo(c, player)
  if (c.phase === 'rim') {
    if (c.time >= RIM_SECONDS) {
      c.phase = 'chase'
      c.time = 0
    }
    return false
  }
  const dx = player.x - c.x
  const dz = player.z - c.z
  const d = Math.hypot(dx, dz)
  if (d <= CATCH_RANGE) return true
  const step = Math.min(CHASE_SPEED * dt, d)
  c.x += (dx / d) * step
  c.z += (dz / d) * step
  return Math.hypot(player.x - c.x, player.z - c.z) <= CATCH_RANGE
}

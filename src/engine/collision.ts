import type { Vec3 } from '../types'

export interface Box {
  min: Vec3
  max: Vec3
}

export interface ResolveResult {
  pos: Vec3
  vel: Vec3
  onGround: boolean
}

/** Capsule: 1.8 m tall, 0.3 m radius. `pos` is the feet position. */
export const CAPSULE_HEIGHT = 1.8
export const CAPSULE_RADIUS = 0.3

const MAX_PASSES = 4
/** Overlaps smaller than this count as touching, so a resolved result stays resolved. */
const EPS = 1e-9
/** How close the feet must be to a box top to count as standing on it. */
const GROUND_EPS = 1e-6

type Axis = 'x' | 'y' | 'z'

interface Hit {
  axis: Axis
  /** Signed push distance along the axis that clears the box. */
  push: number
  depth: number
}

/**
 * Penetration of the capsule (bounded by an axis-aligned box of its extents)
 * into one Box, along the axis of least penetration. Null when not overlapping.
 */
function leastPenetration(pos: Vec3, box: Box): Hit | null {
  const r = CAPSULE_RADIUS
  const axes: Array<[Axis, number, number]> = [
    ['y', pos.y, pos.y + CAPSULE_HEIGHT],
    ['x', pos.x - r, pos.x + r],
    ['z', pos.z - r, pos.z + r],
  ]
  let best: Hit | null = null
  for (const [axis, lo, hi] of axes) {
    const upper = hi - box.min[axis] // push toward negative to clear
    const lower = box.max[axis] - lo // push toward positive to clear
    if (upper <= EPS || lower <= EPS) return null
    const down = upper < lower
    const depth = down ? upper : lower
    if (best === null || depth < best.depth) {
      best = { axis, push: down ? -upper : lower, depth }
    }
  }
  return best
}

function isOnGround(pos: Vec3, boxes: Box[]): boolean {
  const r = CAPSULE_RADIUS
  for (const b of boxes) {
    if (
      Math.abs(pos.y - b.max.y) <= GROUND_EPS &&
      pos.x + r > b.min.x + EPS &&
      pos.x - r < b.max.x - EPS &&
      pos.z + r > b.min.z + EPS &&
      pos.z - r < b.max.z - EPS
    ) {
      return true
    }
  }
  return false
}

/**
 * Push the capsule out of the boxes. Up to 4 passes; each pass resolves the
 * deepest overlap along its axis of least penetration and removes only the
 * velocity component pointing into the box, so motion along the surface is kept.
 * If overlap remains after the last pass, the best position found is returned.
 * Never throws.
 */
export function resolveCapsule(pos: Vec3, vel: Vec3, boxes: Box[]): ResolveResult {
  const p = { x: pos.x, y: pos.y, z: pos.z }
  const v = { x: vel.x, y: vel.y, z: vel.z }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let worst: Hit | null = null
    for (const box of boxes) {
      const hit = leastPenetration(p, box)
      if (hit && (worst === null || hit.depth > worst.depth)) worst = hit
    }
    if (worst === null) break
    p[worst.axis] += worst.push
    // Zero velocity only when it opposes the push (moves into the box).
    if (worst.push > 0 ? v[worst.axis] < 0 : v[worst.axis] > 0) v[worst.axis] = 0
  }

  return { pos: p, vel: v, onGround: isOnGround(p, boxes) }
}

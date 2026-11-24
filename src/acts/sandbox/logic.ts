// Pure sandbox logic: zero-g zone containment, move mode rule, test Timeline guard.
// No Three.js or React imports.
import type { Box } from '../../engine/collision'
import type { MoveMode, Vec3 } from '../../types'

/** True if the point is inside the box (faces included). */
export function isInsideZone(p: Vec3, zone: Box): boolean {
  return (
    p.x >= zone.min.x &&
    p.x <= zone.max.x &&
    p.y >= zone.min.y &&
    p.y <= zone.max.y &&
    p.z >= zone.min.z &&
    p.z <= zone.max.z
  )
}

/**
 * Move mode after checking the eye against the zero-g zone: zeroG while inside,
 * back to walk once outside. A seated player is never changed by the zone.
 */
export function nextMoveMode(current: MoveMode, eyeInsideZone: boolean): MoveMode {
  if (current === 'seated') return current
  if (eyeInsideZone) return 'zeroG'
  return current === 'zeroG' ? 'walk' : current
}

/** The test Timeline may start only when none exists or the last one has finished. */
export function canStartTestTimeline(current: { finished: boolean } | null): boolean {
  return current === null || current.finished
}

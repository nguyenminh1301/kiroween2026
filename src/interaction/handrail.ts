// Pure handrail usability check. No Three.js or React imports.

import type { Vec3 } from '../types'

/** A handrail is usable when the eye is within this distance, inclusive. */
export const HANDRAIL_REACH = 2.0

export function isHandrailUsable(eye: Vec3, handrail: Vec3): boolean {
  const dx = eye.x - handrail.x
  const dy = eye.y - handrail.y
  const dz = eye.z - handrail.z
  const d2 = dx * dx + dy * dy + dz * dz
  return d2 <= HANDRAIL_REACH * HANDRAIL_REACH
}

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

export type UseAction = 'use' | 'push' | 'none'

/**
 * What pressing E does. An interactable under the view is used unless a scripted look is turning
 * the view. A handrail in reach always pushes off, also during a scripted look and with no aim.
 */
export function resolveUse(picked: boolean, railInReach: boolean, focusActive: boolean): UseAction {
  if (picked) return focusActive ? 'none' : 'use'
  return railInReach ? 'push' : 'none'
}

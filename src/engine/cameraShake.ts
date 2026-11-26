// One optional camera shaker. An act sets it, the player camera adds its sample after posing the camera.
// No Three.js or React imports.
import { cleanupRegistry } from './cleanupRegistry'

export interface ShakeSample {
  /** Rotation in radians about x, y and z. */
  rx: number
  ry: number
  rz: number
  /** Offset in metres. */
  ox: number
  oy: number
  oz: number
}

export type Shaker = () => ShakeSample | null

let current: Shaker | null = null

/** Set the shaker. Removed again on unload. */
export function setCameraShaker(s: Shaker | null): void {
  current = s
  if (s)
    cleanupRegistry.register(() => {
      if (current === s) current = null
    })
}

export const getCameraShaker = (): Shaker | null => current

/** Size of a sample: the larger of the offset length in metres and the rotation length in radians. 0 for none. */
export function shakeMagnitude(s: ShakeSample | null): number {
  if (!s) return 0
  return Math.max(Math.hypot(s.ox, s.oy, s.oz), Math.hypot(s.rx, s.ry, s.rz))
}

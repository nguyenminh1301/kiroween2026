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

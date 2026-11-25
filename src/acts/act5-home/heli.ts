// The Sea King's flight from the carrier to a hover beside the capsule. Pure data, no Three.js.
import type { Vec3 } from '../../types'

export const HELI_START_AT = 46
export const HELI_ARRIVE_AT = 58
/** Hornet's offset from the capsule: x, z. */
export const HORNET_OFFSET = { x: 420, z: -760 } as const
/** Where the helicopter leaves the carrier: the flight deck. */
export const HELI_FROM: Vec3 = { x: HORNET_OFFSET.x, y: 28, z: HORNET_OFFSET.z }
/** Low hover beside the capsule. */
export const HELI_HOVER: Vec3 = { x: 9, y: 11, z: 4 }

export const smoothstep = (f: number): number => {
  const x = Math.min(1, Math.max(0, f))
  return x * x * (3 - 2 * x)
}

/** 0 before the flight, 1 after it, smooth in between. */
export function heliProgress(t: number): number {
  return smoothstep((t - HELI_START_AT) / (HELI_ARRIVE_AT - HELI_START_AT))
}

export function heliPos(t: number): Vec3 {
  const p = heliProgress(t)
  return {
    x: HELI_FROM.x + (HELI_HOVER.x - HELI_FROM.x) * p,
    y: HELI_FROM.y + (HELI_HOVER.y - HELI_FROM.y) * p,
    z: HELI_FROM.z + (HELI_HOVER.z - HELI_FROM.z) * p,
  }
}

/** Heading in radians: toward the capsule while flying, the same at the hover. */
export function heliYaw(t: number): number {
  const p = heliPos(t)
  return Math.atan2(-p.x, -p.z)
}

// Pose logic for the act 3 creature: held poses that snap, head tilts toward sounds. Pure.
export const POSE_RATE = 8

/** Time snapped to 8 steps per second, so the creature moves in held poses. */
export const snapTime = (t: number): number => Math.floor(t * POSE_RATE) / POSE_RATE

/** Head yaw offset (radians) toward a sound at (sx, sz), for a body at (x, z) facing `heading`. */
export function headToward(x: number, z: number, heading: number, sx: number, sz: number): number {
  const want = Math.atan2(sx - x, sz - z)
  let d = want - heading
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return Math.max(-1.1, Math.min(1.1, d))
}

type J3 = [number, number, number]

export interface Angles {
  spine: number
  neckX: number
  /** Per side: shoulder, elbow, wrist. */
  arm: [J3, J3]
  /** Per side: hip, knee, ankle. */
  leg: [J3, J3]
}

/** Joint angles for an animation at a snapped phase. */
export function anglesFor(anim: 'walk' | 'freeze' | 'crawl', phase: number): Angles {
  const s = Math.sin(phase)
  if (anim === 'crawl') {
    return {
      spine: -1.25,
      neckX: 1,
      arm: [
        [-2.5 + s * 0.5, 0.3, -0.2],
        [-2.5 - s * 0.5, 0.3, -0.2],
      ],
      leg: [
        [-1.2 - s * 0.5, 1.4, -0.4],
        [-1.2 + s * 0.5, 1.4, -0.4],
      ],
    }
  }
  if (anim === 'walk') {
    // Forward walk: the torso leans forward, elbows and knees bend forward and back, and each arm swings
    // against the leg on its side. The creature's front is +z, so a positive hip angle swings the leg back.
    return {
      spine: 0.14,
      neckX: -0.1,
      arm: [
        [-s * 0.35, -0.7, 0.3],
        [s * 0.35, -0.7, 0.3],
      ],
      leg: [
        [s * 0.45, 0.3 + Math.max(0, -s) * 0.6, -0.2],
        [-s * 0.45, 0.3 + Math.max(0, s) * 0.6, -0.2],
      ],
    }
  }
  return {
    spine: -0.1,
    neckX: 0.1,
    arm: [
      [0.05, 0.5, -0.3],
      [0.05, 0.5, -0.3],
    ],
    leg: [
      [0.05, -0.2, 0.2],
      [0.05, -0.2, 0.2],
    ],
  }
}

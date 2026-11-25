// Timing for the title backdrop. Pure functions: no Three.js or React imports.
export const LOOP_S = 24
export const CREATURE_EVERY_S = 14
export const CREATURE_CROSS_S = 5

export interface DriftPose {
  x: number
  y: number
  z: number
  yaw: number
  roll: number
}

/** Camera pose at time `t`. It is periodic with period LOOP_S, so the loop has no jump. */
export function driftPose(t: number): DriftPose {
  const a = (t / LOOP_S) * Math.PI * 2
  return {
    x: Math.sin(a * 2) * 0.12,
    y: 1.3 + Math.sin(a * 3) * 0.04,
    z: -5 - (1 - Math.cos(a)) * 1.6,
    yaw: Math.sin(a * 2 + 1) * 0.035,
    roll: Math.sin(a * 3) * 0.012,
  }
}

/** 0 to 1 progress of the creature crossing at time `t`, or null when it is not on screen. */
export function creatureProgress(t: number): number | null {
  const k = t % CREATURE_EVERY_S
  return k < CREATURE_CROSS_S ? k / CREATURE_CROSS_S : null
}

// How far the article has decayed. Pure.
export const ROT_REST = 0.45
export const ROT_HUNT = 1

export interface RotInput {
  dreaming: boolean
  hunting: boolean
}

/** The level the page moves toward: 0 normal, 0.45 during the dream, 1 while the creature hunts. */
export function rotTarget(s: RotInput): number {
  if (!s.dreaming) return 0
  return s.hunting ? ROT_HUNT : ROT_REST
}

const RISE_HUNT = 0.9 // per second, the hunt hits fast
const RISE_DREAM = 0.35
const FALL_HUNT_END = 0.2 // eases off when it loses the player
const FALL_WAKE = 0.15 // 0.45 to 0 in 3 s, 1 to 0 in under 7 s

/** One step toward the target. Rises fast in a hunt, falls slowly. */
export function stepRot(level: number, target: number, dt: number): number {
  if (level === target) return level
  if (level < target) return Math.min(target, level + (target >= ROT_HUNT ? RISE_HUNT : RISE_DREAM) * dt)
  return Math.max(target, level - (target > 0 ? FALL_HUNT_END : FALL_WAKE) * dt)
}

/** Seconds to the next small glitch. More often when the level is high. `r` is a random number in [0, 1). */
export function glitchDelay(level: number, r: number): number {
  return (5 - 3.8 * Math.min(1, Math.max(0, level))) * (0.5 + r)
}

/** Scale of the SVG displacement on headlines. */
export function smearScale(level: number): number {
  return Math.round(level * level * 9 * 10) / 10
}

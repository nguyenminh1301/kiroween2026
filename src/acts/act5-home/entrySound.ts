// Re-entry sound levels, all derived from the glow curve of the entry shot. No Three.js or React imports.
import { entryGlow } from './entryFx'

export interface EntryLevels {
  /** Low rumble, 0 to 1. */
  rumble: number
  /** Roar of the air, 0 to 1. */
  roar: number
  /** Crackle of the burning heat shield: only near the glow peak. */
  crackle: number
  /** 0 outside, 1 in the cabin: how muffled the sound is. */
  muffle: number
  /** Loose items rattling, only in the cabin. */
  rattle: number
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Glow above which the shield starts to crackle. */
export const CRACKLE_FROM = 0.7

/** Sound levels at act time `t`. Every level is a function of `entryGlow(t)`, and the view only sets the muffle. */
export function entrySoundAt(t: number, cabin: boolean): EntryLevels {
  const g = entryGlow(t)
  return {
    rumble: g,
    roar: 0.85 * g,
    crackle: clamp01((g - CRACKLE_FROM) / (1 - CRACKLE_FROM)),
    muffle: cabin ? 1 : 0,
    rattle: cabin ? g : 0,
  }
}

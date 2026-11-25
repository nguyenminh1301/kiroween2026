// Breath hold: up to 8 s, then forced out until SPACE is released. Pure.

export const BREATH_MAX = 8

export interface BreathState {
  holding: boolean
  /** Seconds held so far. */
  held: number
  /** Forced out: SPACE must be released before holding again. */
  locked: boolean
}

export const createBreath = (): BreathState => ({ holding: false, held: 0, locked: false })

export function stepBreath(s: BreathState, spaceDown: boolean, dt: number): BreathState {
  if (!spaceDown) return { holding: false, held: 0, locked: false }
  if (s.locked) return { holding: false, held: 0, locked: true }
  const held = s.held + Math.max(0, dt)
  if (held >= BREATH_MAX) return { holding: false, held: 0, locked: true }
  return { holding: true, held, locked: false }
}

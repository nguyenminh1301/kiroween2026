import type { TensionState } from '../types'

export interface TensionLevels {
  drone: number
  pulse: number
  whine: number
}

export const TENSION_LEVELS: Record<TensionState, TensionLevels> = {
  CALM: { drone: 0, pulse: 0, whine: 0 },
  UNEASE: { drone: 0.35, pulse: 0, whine: 0 },
  STALK: { drone: 0.8, pulse: 0, whine: 0.15 },
  CHASE: { drone: 0.5, pulse: 1, whine: 0.7 },
  RELEASE: { drone: 0.4, pulse: 0, whine: 0.1 },
}

export const TENSION_ORDER: readonly TensionState[] = ['CALM', 'UNEASE', 'STALK', 'CHASE', 'RELEASE']

/** Levels for a state. An unknown state counts as CALM. */
export function tensionLevels(state: TensionState): TensionLevels {
  return TENSION_LEVELS[state] ?? TENSION_LEVELS.CALM
}

import type { Mood, Speaker } from '../types'

export interface Line {
  speaker: Speaker
  text: string
  mood?: Mood
  voiced?: boolean
  /** Reading time in seconds. Defaults to a length based formula. */
  seconds?: number
}

export const SPEAKER_NAMES: Record<Speaker, string> = {
  CDR: 'NEIL ARMSTEAD',
  CMP: 'MIKE COLLIER',
  CAPCOM: 'HOUSTON',
  LOS: 'NO SIGNAL',
  UNKNOWN: 'HOUSTON?',
  PAD: 'GUNTER WENT',
  NARRATOR: '',
  HORNET: 'USS HORNET',
}

export const LINES: Record<string, Line> = {
  'test.capcom': { speaker: 'CAPCOM', text: 'Columbia, Houston. Radio check.', seconds: 2.5 },
  'test.los': { speaker: 'LOS', text: '[static]', seconds: 2 },
  'act0.intro1': {
    speaker: 'NARRATOR',
    voiced: true,
    text: 'July 16, 1969. A million people came to the Cape to watch three men leave the Earth.',
  },
  'act0.intro2': {
    speaker: 'NARRATOR',
    voiced: true,
    text: 'You are one of the three. Before you climb in, look down. They came for you.',
  },
}

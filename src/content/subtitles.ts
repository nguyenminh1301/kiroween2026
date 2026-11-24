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
  'act0.pad1': {
    speaker: 'PAD',
    text: 'Hear that? Go to the rail and wave. Some of them drove all night for this.',
  },
  'act0.pad2': {
    speaker: 'PAD',
    mood: 'shout',
    text: 'Ha! They saw you, Buzz! Okay, hero. Hatch is in the White Room, end of the arm.',
  },
  'act0.pad3': {
    speaker: 'PAD',
    text: 'Strange. I counted four sets of boot prints up here this morning.',
  },
  'act0.board': {
    speaker: 'CDR',
    text: 'There you are, Buzz. Strap in. We have a Moon to catch.',
  },
}

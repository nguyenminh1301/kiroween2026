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
  'act1.count': {
    speaker: 'CAPCOM',
    text: 'Twelve, eleven, ten, nine. Ignition sequence start.',
    seconds: 4,
  },
  'act1.liftoff': { speaker: 'CAPCOM', mood: 'shout', text: 'Liftoff! We have a liftoff!', seconds: 3 },
  'act1.staging': {
    speaker: 'CDR',
    text: 'Staging. Look up at the window, Buzz. Watch the sky go out.',
  },
  'act1.o2': {
    speaker: 'CDR',
    text: 'Huh. Cabin oxygen is running high. That is what four men would breathe.',
  },
  'act1.switch': {
    speaker: 'CDR',
    text: 'Probably a bad sensor. Kill it. Red switch, right by your hand.',
  },
  'act1.key': {
    speaker: 'CDR',
    text: 'Good. Now the computer in front of you. Three presses and we leave orbit.',
  },
  'act1.tli': { speaker: 'CAPCOM', text: 'Apollo 11, Houston. You are go for TLI.' },
  'act1.earth': {
    speaker: 'CMP',
    text: 'Oh, would you look at that. The whole Earth fits in the window.',
  },
  'act1.moon': { speaker: 'CDR', text: 'And that little one is where we are going.' },
  'act1.rest': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, Houston. You are on your way. Get some rest, it is a long drive.',
  },
  'act2.night': {
    speaker: 'CMP',
    text: 'Neil and I are turning in. Do not stay down there all night, Buzz.',
  },
  'act2.out': {
    speaker: 'CDR',
    text: 'Houston wants that lander fault checked before we sleep. Float down and take a look.',
  },
  'act2.breaker': {
    speaker: 'CDR',
    mood: 'distant',
    text: 'Engine arm breaker. The knob snapped off. Find something to push it in with.',
  },
  'act2.pen': {
    speaker: 'CDR',
    mood: 'distant',
    text: 'A pen. That will do. Push the breaker in with it.',
  },
  'act2.fixed': {
    speaker: 'CDR',
    mood: 'distant',
    text: 'That did it. Come on back up, we are turning in.',
  },
  'act2.longer': {
    speaker: 'CMP',
    text: 'You were gone a while. That tunnel is three pushes. Did you get lost in there?',
  },
  'act2.sleep': { speaker: 'CDR', text: 'Lights out. Get in your bag, Buzz. Big day tomorrow.' },
  'act2.flashes': {
    speaker: 'CMP',
    mood: 'whisper',
    text: 'You see the flashes too? Every time I shut my eyes.',
  },
  'act2.breath': {
    speaker: 'CMP',
    mood: 'whisper',
    text: 'Who is breathing like that? There are only three of us in here.',
  },
}

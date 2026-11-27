import type { ActId } from '../types'

export const MENUS = {
  gate: {
    title: 'Open this on a computer',
    body: 'LOSS OF SIGNAL needs a mouse, a keyboard and a screen at least 900 pixels wide.',
  },
  noWebgl: {
    title: 'This browser cannot run the game',
    body: 'The game needs WebGL 2. Turn on hardware acceleration in your browser settings, or use a current version of Chrome, Firefox, Edge or Safari.',
  },
  begin: 'Use headphones. Click to begin.',
  chapters: { title: 'Chapters', back: 'Back' },
  settings: {
    title: 'Settings',
    sensitivity: 'Mouse sensitivity',
    volume: 'Volume',
    subtitleSize: 'Subtitle size',
    reducedMotion: 'Reduced motion',
    back: 'Back',
  },
  pause: {
    title: 'Paused',
    resume: 'Resume',
    restart: 'Restart checkpoint',
    chapters: 'Chapters',
    settings: 'Settings',
    back: 'Back to the article',
  },
  loading: 'Loading',
  clickToContinue: 'Click to continue',
} as const

/** The two answers after waking from the act 3 dream. */
export const DREAM_CHOICES = {
  dream: 'Just a bad dream.',
  fine: "I'm fine. Go back to sleep.",
} as const
export type DreamChoice = keyof typeof DREAM_CHOICES

export const ACT_TITLES: Record<ActId, string> = {
  'act0-pad': 'Pad 39A',
  'act1-launch': 'Launch',
  'act2-coast': 'Coast',
  'act3-farside': 'Far side',
  'act4-moon': 'Tranquility',
  'act5-home': 'Splashdown',
}

/** Form header on the paper menus. */
export const FORM_LINE = 'MSC FORM 1969-07 · CREW COPY'

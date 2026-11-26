import type { ActId } from '../types'

export const GAME_TITLE = 'LOSS OF SIGNAL'

export const MENUS = {
  gate: {
    title: 'Open this on a computer',
    body: 'LOSS OF SIGNAL needs a mouse, a keyboard and a screen at least 900 pixels wide.',
  },
  noWebgl: {
    title: 'This browser cannot run the game',
    body: 'The game needs WebGL 2. Turn on hardware acceleration in your browser settings, or use a current version of Chrome, Firefox, Edge or Safari.',
  },
  warning: {
    title: 'Before you play',
    body: 'This game has flickering lights, flashes and sudden loud sounds. If flashing light affects you, turn on Reduced motion in Settings, or do not play.',
    action: 'Continue',
  },
  headphones: {
    title: 'Use headphones',
    body: 'Most of what you need to know comes through sound: where it is, and how close.',
    action: 'Click to start',
  },
  title: {
    name: GAME_TITLE,
    tagline: 'Apollo 11. July 1969.',
    stamp: 'Classified',
    start: 'Start',
    chapters: 'Chapters',
    settings: 'Settings',
    credits: 'Credits',
  },
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
    settings: 'Settings',
    quit: 'Quit to title',
  },
  loading: 'Loading',
  clickToContinue: 'Click to continue',
  credits: {
    title: 'Credits',
    lines: [
      'Made for Kiroween 2026.',
      'Apollo Guidance Computer source code: public domain, github.com/chrislgarry/Apollo-11.',
      'Fonts: Jost, IBM Plex Mono, Courier Prime and Special Elite.',
      'Full list of assets and licenses: CREDITS.md in the repository.',
    ],
    back: 'Back',
  },
  archive: {
    title: 'Archive',
    intro: 'Everything wrong you could have noticed, and the real record behind it.',
    noticed: 'You noticed',
    missed: 'You missed this one',
    source: 'Source',
    back: 'Back to title',
    menu: 'Archive',
    told: 'You told them:',
  },
} as const

/** The two answers after waking from the act 3 dream. */
export const DREAM_CHOICES = {
  dream: 'Bad dream. Something was in the tunnel.',
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

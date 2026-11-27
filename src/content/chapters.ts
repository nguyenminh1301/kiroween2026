import type { ActId } from '../types'

/** Chapter card lines. Act 0 has none: its narrator does that job. */
export const CHAPTER_INTROS: Partial<Record<ActId, string[]>> = {
  'act1-launch': [
    'July 16, 1969. Launch Complex 39A.',
    'The crew has been lying on their backs for two and a half hours. Liftoff is at 9:32.',
  ],
  'act2-coast': [
    'July 18, 1969. Day three.',
    'Halfway to the Moon, Neil and Buzz open the tunnel and check Eagle for the first time.',
    'Then one more night before lunar orbit.',
  ],
  'act3-farside': [
    'July 19, 1969. Lunar orbit.',
    "Each time Columbia passes behind the Moon, Houston can't hear them. About 48 minutes every orbit.",
  ],
  'act4-moon': ['July 20, 1969.', 'Eagle undocks with Neil and Buzz aboard. Mike stays with Columbia.'],
  'act5-home': [
    'July 24, 1969.',
    'Columbia is coming home at 11 kilometres a second. The Pacific is ahead.',
  ],
}

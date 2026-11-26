import type { ActId } from '../types'

/** Chapter card lines. Act 0 has none: its narrator does that job. */
export const CHAPTER_INTROS: Partial<Record<ActId, string[]>> = {
  'act1-launch': [
    'July 16, 1969. Launch Complex 39A.',
    'Three men strapped in on top of a Saturn V. Liftoff is set for 9:32 in the morning.',
  ],
  'act2-coast': [
    'July 18, 1969. Day three, halfway to the Moon.',
    'Columbia and Eagle fly docked nose to nose. The crew is getting ready to sleep.',
    'Eagle has been showing a fault all day.',
  ],
  'act3-farside': [
    'July 19, 1969. Lunar orbit.',
    'Every two hours the ship passes behind the Moon. For forty-five minutes Houston cannot hear them.',
  ],
  'act4-moon': [
    'July 20, 1969.',
    'Eagle undocks with two men aboard and goes down to the Sea of Tranquility. Mike stays in orbit.',
  ],
  'act5-home': [
    'July 24, 1969.',
    'Columbia fired its engine behind the Moon and headed home. Three days later, the Pacific is coming up fast.',
  ],
}

/** The real photo shown after the flag is planted. */
export const PHOTO = {
  src: '/img/as11-40-5875.jpg',
  caption: 'Apollo 11, July 20, 1969. Buzz Aldrin beside the flag. NASA photo AS11-40-5875.',
  alt: 'A print of a NASA photograph: an astronaut in a white suit and gold visor beside the flag on the Moon.',
  source: 'https://www.hq.nasa.gov/alsj/a11/images11.html',
} as const

export const HUD = {
  wrist: { hr: 'HR', o2: 'O2 3.7 PSI' },
  radio: '(radio)',
  whisper: '(whispering)',
  distant: '(far away)',
  alarm: 'PROG ALARM',
  dsky: { prog: 'PROG', verb: 'VERB', noun: 'NOUN' },
  heliMarkings: { name: 'NAVY', number: '66' },
  burnRoutine: 'BURN_BABY_BURN--MASTER_IGNITION_ROUTINE',
  /** The AGC readout panel during the ascent engine start: a header, then the typed lines. */
  burnPanel: {
    header: 'LUMINARY 099',
    lines: ['ASCENT ENGINE ARMED', 'EXECUTING ROUTINE', 'BURN_BABY_BURN--MASTER_IGNITION_ROUTINE', 'ENGINE ON'],
  },
  caught: 'It found you. Back to the last checkpoint.',
  screen: { errors: ['ERR 0107', 'ERR 0212', 'ERR 0330'], ok: 'OK' },
  gauge: { unit: 'PSI', title: 'CABIN PRESSURE' },
  meter: {
    title: 'NOISE',
    listening: 'IT IS LISTENING',
    heard: 'IT HEARD YOU',
    searching: 'IT IS SEARCHING',
    hidden: 'HIDDEN',
    silent: 'SILENT',
  },
} as const

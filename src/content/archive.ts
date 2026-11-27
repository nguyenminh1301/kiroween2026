export interface Moment {
  id: string
  /** What the player saw in the game. */
  seen: string
  /** The real fact. */
  real: string
  /** Where it is recorded: a name and a link. */
  cite: string
  source: string
}

const JOURNAL = 'https://www.nasa.gov/history/afj/ap11fj/index.html'

/** The real Apollo 11 moments the game shows, in Archive order. The sandbox id test-box is not listed. */
export const MOMENTS: Moment[] = [
  {
    id: 'escape-tower',
    seen: 'After the second stage lit, the launch escape tower and its cover left the capsule. The windows were clear.',
    real: 'The launch escape tower and the boost protective cover were jettisoned about three minutes into the flight, just after the second stage lit. The cover had shielded the command module and its windows until then.',
    cite: 'Apollo 11 Flight Journal',
    source: JOURNAL,
  },
  {
    id: 'loss-of-signal',
    seen: 'The ship passed behind the Moon and Houston could not be heard.',
    real: 'Behind the Moon the spacecraft had no radio contact with Earth at all, about 48 minutes of every orbit.',
    cite: 'Apollo 11 Flight Journal',
    source: JOURNAL,
  },
  {
    id: 'alarm-1202',
    seen: 'A program alarm, a 1202, lit the DSKY during the powered descent.',
    real: "Eagle's computer gave 1202 and 1201 alarms on the way down. It was short of time for its jobs and dropped the low-priority ones. Houston called it go and the landing went on.",
    cite: 'Apollo 11 Flight Journal',
    source: JOURNAL,
  },
  {
    id: 'eagle-landed',
    seen: 'Neil called Houston after the contact light: the Eagle has landed.',
    real: 'Armstrong said "Houston, Tranquility Base here. The Eagle has landed." at about 20:17 UTC on July 20, 1969, in the Sea of Tranquility.',
    cite: 'Apollo Lunar Surface Journal',
    source: 'https://www.nasa.gov/history/alsj-and-afj/',
  },
  {
    id: 'seismo-steps',
    seen: 'Houston said the seismometer was already picking up the crew\'s footsteps.',
    real: 'The seismometer left on the Moon, the Passive Seismic Experiment Package, recorded the astronauts\' footsteps. It ran for about three weeks.',
    cite: 'Apollo Lunar Surface Journal',
    source: 'https://www.nasa.gov/history/alsj-and-afj/',
  },
  {
    id: 'flag-knocked',
    seen: 'The ascent engine fired and the flag fell over.',
    real: 'Aldrin reported that the blast of the ascent engine knocked the flag over. It had a horizontal rod along the top edge to hold the cloth out, because there is no wind on the Moon.',
    cite: 'Apollo 11 Flight Journal',
    source: JOURNAL,
  },
  {
    id: 'burn-routine',
    seen: 'The ascent engine fired straight down into the descent stage, with it on top, and a green readout named a routine.',
    real: 'The lunar module used its descent stage as a launch pad: the ascent engine fired down onto it. The AGC routine that ignited the engines is named BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.',
    cite: 'Apollo Guidance Computer source, Luminary 099',
    source: 'https://github.com/chrislgarry/Apollo-11/blob/master/Luminary099/BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc',
  },
  {
    id: 'hornet',
    seen: 'USS Hornet and a Sea King helicopter, Helicopter 66, came for the capsule after splashdown.',
    real: 'Columbia landed in the Pacific on July 24, 1969, about 24 km (13 nautical miles) from the recovery carrier USS Hornet. Swimmers opened the hatch and Helicopter 66 flew the crew to the ship.',
    cite: 'Apollo 11 Flight Journal',
    source: JOURNAL,
  },
]

/** The moment that carries the player's act 3 answer. */
export const TOLD_MOMENT = 'loss-of-signal'

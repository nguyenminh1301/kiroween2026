import type { ActId } from '../types'

/** One real NASA photo: the file in `public/img/article/`, what it shows with its date, and its NASA number. */
export interface PrintPhoto {
  file: string
  what: string
  number: string
}

export const PRINT_PHOTOS: Record<string, PrintPhoto> = {
  liftoff: { file: 's69-39961.jpg', what: 'Apollo 11 lifts off, July 16, 1969', number: 'S69-39961' },
  earth: { file: 'as11-36-5355.jpg', what: 'Africa from Apollo 11, July 17, 1969', number: 'AS11-36-5355' },
  broadcast: {
    file: 's69-39532.jpg',
    what: 'The lunar module pilot on the crew TV broadcast, July 18, 1969',
    number: 'S69-39532',
  },
  earthrise: { file: 'as11-44-6552.jpg', what: 'Earth rising over the Moon, July 1969', number: 'AS11-44-6552' },
  eagleInside: {
    file: 'as11-36-5390.jpg',
    what: 'The lunar module pilot inside Eagle, July 20, 1969',
    number: 'AS11-36-5390',
  },
  control: {
    file: 's69-39815.jpg',
    what: 'Mission Control during the moonwalk, July 20, 1969',
    number: 'S69-39815',
  },
  commander: {
    file: 'as11-37-5528.jpg',
    what: 'The commander inside Eagle after the moonwalk, July 20, 1969',
    number: 'AS11-37-5528',
  },
  rendezvous: {
    file: 'as11-44-6642.jpg',
    what: 'Eagle comes back to Columbia, July 21, 1969',
    number: 'AS11-44-6642',
  },
  raft: { file: 's69-21698.jpg', what: 'The crew waits in the raft, July 24, 1969', number: 'S69-21698' },
  lifted: {
    file: 's69-21294.jpg',
    what: 'Columbia is lifted aboard Hornet, July 24, 1969',
    number: 'S69-21294',
  },
  quarantineWalk: {
    file: 's69-40753.jpg',
    what: 'The crew walks to the quarantine trailer, July 24, 1969',
    number: 'S69-40753',
  },
  quarantineTrailer: {
    file: 'ksc-69pc-484.jpg',
    what: 'The crew inside the quarantine trailer, July 26, 1969',
    number: 'KSC-69PC-484',
  },
}

/** The prints of each act, in the order the story reaches them. An act calls `showPrint(act, id)`. */
export const PRINT_SCHEDULE: Partial<Record<ActId, string[]>> = {
  'act1-launch': ['liftoff', 'earth'],
  'act2-coast': ['broadcast'],
  'act3-farside': ['earthrise'],
  'act4-moon': ['eagleInside', 'control', 'commander', 'rendezvous'],
  'act5-home': ['raft', 'lifted', 'quarantineWalk', 'quarantineTrailer'],
}

export const PRINT_LINE2 = 'NASA photo'

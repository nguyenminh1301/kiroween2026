import type { Objective } from '../engine/store'

/** Objective strips. Act specs add their own entries. */
export const CHECKLISTS: Record<string, Objective> = {
  'test.switch': { text: 'Flip the switch on the wall', keys: 'E', markers: ['switch'] },
  act0Wave: { text: 'Go to the railing, look down at the crowd and wave', keys: 'E' },
  act0Board: {
    text: 'Walk to the White Room at the end of the arm and climb in',
    keys: 'E',
    markers: ['act0:hatch'],
  },
  act1Switch: { text: 'Flip the red switch by your right hand', keys: 'E', markers: ['act1:switch'] },
  act1Key: { text: 'Press the computer in front of you three times', keys: 'E', markers: ['act1:dsky'] },
  act2Back: { text: 'Float back up the tunnel to the command module', keys: 'E' },
  act2Sleep: { text: 'Get into your sleeping bag', keys: 'E', markers: ['act2:bag'] },
  act2Eyes: { text: 'Hold C to close your eyes and sleep', keys: 'C' },
  act3Find: { text: 'Find Mike at the far end of the tunnel', keys: 'E' },
  act3Hide: {
    text: 'Hide in the locker on your left. Inside, hold SPACE',
    keys: 'E',
    markers: ['act3:locker0'],
  },
  act3Sneak: {
    text: 'Reach Mike. Push off gently. If it comes your way, hide in a locker',
    keys: 'E',
  },
  act3Hunted: { text: 'It heard you. Get in a locker and hold SPACE', keys: 'SPACE' },
  act3Chase: {
    text: 'Run. Keep pushing off the rails back to the hatch',
    keys: 'E',
    markers: ['act3:hatch'],
  },
  act4Tasks: {
    text: 'Surface tasks, any order',
    keys: 'E',
    markers: ['act4:flagkit', 'act4:scoop', 'act4:seismokit', 'act4:spot', 'act4:sample', 'act4:seismo'],
  },
  act4Run: { text: 'Run to the ladder and climb in. SPACE jumps', keys: 'E', markers: ['act4:ladder'] },
}

/** Act 4 surface task strip text. */
export const ACT4_TEXT = {
  prefix: 'Surface tasks, any order: ',
  flag: 'Plant the flag',
  sample: 'Scoop a soil sample',
  seismo: 'Set up the seismometer',
  carryFlag: 'Carry the flag to its marker and plant it',
  carryScoop: 'Take the scoop to the sample marker',
  carrySeismo: 'Carry the seismometer to its marker',
} as const

/** Act 2 repair strip text. */
export const ACT2_TEXT = {
  prefix: 'Repairs left, any order: ',
  o2Hammer: 'oxygen line (hammer is in the tool pouch, in the tunnel)',
  o2Tap: 'oxygen line (tap the joint)',
  press: 'cabin pressure (gauge, command module)',
  comp: 'computer (screen, lander)',
} as const

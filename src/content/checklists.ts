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
}

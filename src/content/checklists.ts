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
  act2Out: { text: 'Float down the tunnel to the lander. Look at a rail and push off', keys: 'E' },
  act2Fix: { text: 'Find something to push the breaker in with', keys: 'E', markers: ['act2:pen'] },
  act2Push: { text: 'Push the breaker in with the pen', keys: 'E', markers: ['act2:breaker'] },
  act2Back: { text: 'Float back up the tunnel to the command module', keys: 'E' },
  act2Sleep: { text: 'Get into your sleeping bag', keys: 'E', markers: ['act2:bag'] },
  act2Eyes: { text: 'Hold C to close your eyes and sleep', keys: 'C' },
}

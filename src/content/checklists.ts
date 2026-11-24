import type { Objective } from '../engine/store'

/** Objective strips. Act specs add their own entries. */
export const CHECKLISTS: Record<string, Objective> = {
  'test.switch': { text: 'Flip the switch on the wall', keys: 'E', markers: ['switch'] },
}

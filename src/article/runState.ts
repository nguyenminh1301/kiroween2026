// What the article page knows about the run in the game window. Pure.
import type { ActId } from '../types'
import type { HostMessage } from '../engine/hostBridge'

export interface RunState {
  act: ActId | null
  /** True from the first act until the run ends or the player leaves. */
  running: boolean
  hunting: boolean
  ended: boolean
}

export const IDLE_RUN: RunState = { act: null, running: false, hunting: false, ended: false }

export function reduceRun(s: RunState, m: HostMessage): RunState {
  switch (m.type) {
    case 'act':
      // The act is null for an instant between two acts, so a run stays a run.
      return { act: m.act ?? s.act, running: s.running || m.act !== null, hunting: false, ended: s.ended }
    case 'hunt':
      return s.act === 'act3-farside' ? { ...s, hunting: m.on } : s
    case 'leave':
      return { ...IDLE_RUN }
    case 'end':
      return { ...IDLE_RUN, ended: true }
  }
}

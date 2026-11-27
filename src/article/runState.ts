// What the article page knows about the run in the game window. Pure.
import type { ActId } from '../types'
import type { HostMessage } from '../engine/hostBridge'

export interface RunState {
  act: ActId | null
  /** True from the first act until the run ends or the player leaves. */
  running: boolean
  /** The act 3 dream is running. */
  dreaming: boolean
  hunting: boolean
  ended: boolean
}

export const IDLE_RUN: RunState = { act: null, running: false, dreaming: false, hunting: false, ended: false }

export function reduceRun(s: RunState, m: HostMessage): RunState {
  switch (m.type) {
    case 'act':
      // The act is null for an instant between two acts, so a run stays a run.
      // The dream starts after the act is unloaded and before the new act is announced, so keep it for act 3 only.
      if (m.act === 'act3-farside') return { ...s, act: m.act, running: true }
      return { act: m.act ?? s.act, running: s.running || m.act !== null, dreaming: false, hunting: false, ended: s.ended }
    case 'dream':
      return { ...s, dreaming: m.on, hunting: m.on ? s.hunting : false }
    case 'hunt':
      return s.dreaming ? { ...s, hunting: m.on } : s
    case 'leave':
      return { ...IDLE_RUN }
    case 'end':
      return { ...IDLE_RUN, ended: true }
  }
}

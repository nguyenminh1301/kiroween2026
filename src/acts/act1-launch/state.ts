// Mutable act 1 state read by the scene every frame. Plain object, never React state.
import { resetCabinState } from '../../procgen/cabin/cabinState'
import type { View } from './timelines'

export const act1State = {
  view: 'cabin' as View,
  /** Launch timeline seconds, or 0 before it starts. */
  launchT: 0,
  /** TLI timeline seconds, or 0 before it starts. */
  tliT: 0,
  ignited: false,
}

export function resetAct1State(): void {
  act1State.view = 'cabin'
  resetCabinState()
  act1State.launchT = 0
  act1State.tliT = 0
  act1State.ignited = false
}

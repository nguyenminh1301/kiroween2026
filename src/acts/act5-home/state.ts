// Mutable act 5 state read by the scene every frame. Plain object, never React state.
import { resetCabinState } from '../../procgen/cabin/cabinState'
import type { View } from './timeline'

export const act5State = {
  view: 'cabin' as View,
  /** Timeline seconds. */
  t: 0,
  heat: 0,
  /** True once the timeline has begun. */
  started: false,
}

export function resetAct5State(): void {
  resetCabinState()
  act5State.view = 'cabin'
  act5State.t = 0
  act5State.heat = 0
  act5State.started = false
}

// Mutable act 0 state read by the scene every frame. Plain object, never React state.
import { MURMUR } from './crowdLogic'

export const act0State = {
  excitement: MURMUR,
  waved: false,
  /** Hatch handle and swing angles, radians. */
  handle: 0,
  hatchOpen: 0,
}

export function resetAct0State(): void {
  act0State.excitement = MURMUR
  act0State.waved = false
  act0State.handle = 0
  act0State.hatchOpen = 0
}

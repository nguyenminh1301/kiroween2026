// Mutable act 0 state read by the scene every frame. Plain object, never React state.
import { MURMUR } from './crowdLogic'

export const act0State = {
  excitement: MURMUR,
  waved: false,
}

export function resetAct0State(): void {
  act0State.excitement = MURMUR
  act0State.waved = false
}

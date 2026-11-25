// Mutable act 3 state read by the scene each frame. Plain object, never React state.
import type { Monster } from '../../director/monster'

export const act3State = {
  /** The chase is on: the floor strips run their wave. */
  chase: false,
  /** The creature is drawn. */
  creatureVisible: false,
  monster: null as Monster | null,
  /** Lifts the creature off the floor in the chase, set by the runtime. */
  creatureY: 0,
}

export function resetAct3State(): void {
  act3State.chase = false
  act3State.creatureVisible = false
  act3State.monster = null
  act3State.creatureY = 0
}

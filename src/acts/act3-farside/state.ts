// Mutable act 3 state read by the scene each frame. Plain object, never React state.
import type { Monster } from '../../director/monster'

export type Crew = 'cdr' | 'cmp'

export const act3State = {
  /** The chase is on: the floor strips run their wave. */
  chase: false,
  /** The creature is drawn. */
  creatureVisible: false,
  monster: null as Monster | null,
  /** Lifts the creature off the floor, set by the runtime. */
  creatureY: 0,
  /** The dream corridor, or the real cabin after waking. */
  world: 'dream' as 'dream' | 'real',
  /** The cage door is open. */
  cageOpen: false,
  /** Who is on Buzz's shoulders. */
  carried: null as Crew | null,
  /** Who lies in his bag. */
  laid: { cdr: false, cmp: false },
  /** Both crewmen left the cage: the second one sits there alone. */
  second: null as Crew | null,
  /** The corridor is silent and the creature is gone. */
  silent: false,
  /** Seconds into the lunge, or null. */
  lunge: null as number | null,
  /** The kind of hiding spot the player is in, or null. */
  hideKind: null as 'locker' | 'corner' | 'bag' | null,
  /** A sound the creature turns its head toward. */
  sound: null as { x: number; z: number } | null,
}

export function resetAct3State(): void {
  act3State.chase = false
  act3State.creatureVisible = false
  act3State.monster = null
  act3State.creatureY = 0
  act3State.world = 'dream'
  act3State.cageOpen = false
  act3State.carried = null
  act3State.laid = { cdr: false, cmp: false }
  act3State.second = null
  act3State.silent = false
  act3State.lunge = null
  act3State.sound = null
  act3State.hideKind = null
}

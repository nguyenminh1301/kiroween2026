// Mutable act 4 state read by the scene each frame. Plain object, never React state.
import type { Item, TaskState } from './tasks'
import { createTasks } from './tasks'

export const act4State = {
  /** Lander height above the ground, metres. */
  landerY: 0,
  plume: false,
  dust: 0,
  /** Descent fill light on the lander, 0 or 1. */
  fill: 0,
  /** True while a cabin shot is on: the hull is hidden, the interior shows. */
  cabinView: false,
  /** Ascent stage climb in the liftoff, metres. */
  ascentRise: 0,
  /** Ascent engine fire, 0 to 1. */
  fire: 0,
  flagTip: 0,
  /** Seconds since the ascent engine lit, or -1 before. Drives the blast scraps and dust. */
  blast: -1,
  /** The climb hands at the bottom of the view: shown on the rails, moving with `phase`. */
  climb: { hands: false, phase: 0 },
  tasks: createTasks() as TaskState,
  carrying: null as Item | null,
}

export function resetAct4State(): void {
  act4State.landerY = 0
  act4State.plume = false
  act4State.dust = 0
  act4State.fill = 0
  act4State.cabinView = false
  act4State.ascentRise = 0
  act4State.fire = 0
  act4State.flagTip = 0
  act4State.blast = -1
  act4State.climb = { hands: false, phase: 0 }
  act4State.tasks = createTasks()
  act4State.carrying = null
}

// Mutable act 4 state read by the scene each frame. Plain object, never React state.
import type { Item, TaskState } from './tasks'
import { createTasks } from './tasks'

export type CreatureAnim = 'walk' | 'freeze' | 'crawl'

export const act4State = {
  /** Lander height above the ground, metres. */
  landerY: 0,
  plume: false,
  dust: 0,
  /** Descent fill light on the lander, 0 or 1. */
  fill: 0,
  /** Ascent stage climb in the liftoff, metres. */
  ascentRise: 0,
  /** Ascent engine fire, 0 to 1. */
  fire: 0,
  flagTip: 0,
  tasks: createTasks() as TaskState,
  carrying: null as Item | null,
  creature: { visible: false, x: 0, y: 0, z: 0, heading: 0, anim: 'freeze' as CreatureAnim },
}

export function resetAct4State(): void {
  act4State.landerY = 0
  act4State.plume = false
  act4State.dust = 0
  act4State.fill = 0
  act4State.ascentRise = 0
  act4State.fire = 0
  act4State.flagTip = 0
  act4State.tasks = createTasks()
  act4State.carrying = null
  act4State.creature = { visible: false, x: 0, y: 0, z: 0, heading: 0, anim: 'freeze' }
}

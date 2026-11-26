// The act 2 phase machine: repairs, sleep, done. Pure: no Three.js or React imports.
// The three repairs can be done in any order. The tunnel grows the first time the player is in the lander,
// and the player must have floated back to the command module once before bedtime.

export type Phase = 'repairs' | 'sleep' | 'done'
export type Act2Interactable = 'act2:bag'

export interface Phases {
  phase(): Phase
  inBag(): boolean
  /** The player is in the lander. True the first time only: the tunnel grows now. */
  enterLander(): boolean
  /** The player is back in the command module after the lander. True the first time only. */
  crossBack(): boolean
  /** The repairs state changed. */
  setRepairsDone(done: boolean): void
  /** The player got into the bag. Only works in `sleep`, once. */
  enterBag(): boolean
  /** The sleep ended. Only works in `sleep` once in the bag. */
  finish(): boolean
  enabled(id: Act2Interactable): boolean
}

export function createPhases(): Phases {
  let visitedLander = false
  let crossedBack = false
  let repairs = false
  let bag = false
  let finished = false
  const phase = (): Phase => (finished ? 'done' : repairs && crossedBack ? 'sleep' : 'repairs')
  return {
    phase,
    inBag: () => bag,
    enterLander() {
      if (visitedLander) return false
      visitedLander = true
      return true
    },
    crossBack() {
      if (!visitedLander || crossedBack) return false
      crossedBack = true
      return true
    },
    setRepairsDone(done) {
      repairs = done
    },
    enterBag() {
      if (phase() !== 'sleep' || bag) return false
      bag = true
      return true
    },
    finish() {
      if (phase() !== 'sleep' || !bag) return false
      finished = true
      return true
    },
    enabled: () => phase() === 'sleep' && !bag,
  }
}

// The act 2 phase machine: outbound, fix, return, sleep, done. Pure: no Three.js or React imports.

export type Phase = 'outbound' | 'fix' | 'return' | 'sleep' | 'done'
export type Act2Interactable = 'act2:pen' | 'act2:breaker' | 'act2:bag'

export interface Phases {
  phase(): Phase
  holdingPen(): boolean
  inBag(): boolean
  /** The player crossed into the lander. Only works in `outbound`. */
  crossLander(): boolean
  /** The player took the pen. Only works in `fix` while not holding it. */
  takePen(): boolean
  /** The breaker was pushed in. Only works in `fix` while holding the pen. */
  fixBreaker(): boolean
  /** The player crossed back into the command module. Only works in `return`. */
  crossCm(): boolean
  /** The player got into the bag. Only works in `sleep`, once. */
  enterBag(): boolean
  /** The sleep ended. Only works in `sleep` once in the bag. */
  finish(): boolean
  /** Whether an interactable may be used now. */
  enabled(id: Act2Interactable): boolean
}

export function createPhases(): Phases {
  let phase: Phase = 'outbound'
  let holding = false
  let bag = false
  return {
    phase: () => phase,
    holdingPen: () => holding,
    inBag: () => bag,
    crossLander() {
      if (phase !== 'outbound') return false
      phase = 'fix'
      return true
    },
    takePen() {
      if (phase !== 'fix' || holding) return false
      holding = true
      return true
    },
    fixBreaker() {
      if (phase !== 'fix' || !holding) return false
      phase = 'return'
      holding = false
      return true
    },
    crossCm() {
      if (phase !== 'return') return false
      phase = 'sleep'
      return true
    },
    enterBag() {
      if (phase !== 'sleep' || bag) return false
      bag = true
      return true
    },
    finish() {
      if (phase !== 'sleep' || !bag) return false
      phase = 'done'
      return true
    },
    enabled(id) {
      if (id === 'act2:pen') return phase === 'fix' && !holding
      if (id === 'act2:breaker') return phase === 'fix' && holding
      return phase === 'sleep' && !bag
    },
  }
}

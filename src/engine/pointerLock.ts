export interface LockInputs {
  lockLost: boolean
  wasHeld: boolean
  escapePressed: boolean
  tabHidden: boolean
  debug: boolean
}

/**
 * Pause decision. Tab hidden, Escape, or lock lost after it was held all pause.
 * Lock lost without ever being held leaves `current` unchanged, in debug or not.
 * `debug` never changes the outcome: debug play without lock just means no lock
 * event ever arrives with `wasHeld` set.
 */
export function nextPaused(current: boolean, inputs: LockInputs): boolean {
  if (inputs.tabHidden || inputs.escapePressed) return true
  if (inputs.lockLost && inputs.wasHeld) return true
  return current
}

export const NO_LOCK_INPUTS: LockInputs = {
  lockLost: false,
  wasHeld: false,
  escapePressed: false,
  tabHidden: false,
  debug: false,
}

export interface PauseCollector {
  /** Record raw events seen since the last decision. Flags are OR-ed together. */
  note(partial: Partial<LockInputs>): void
  /** Settle everything noted so far into one decision and reset. Call once per frame. */
  decide(current: boolean): boolean
}

/**
 * Collapses several raw events in one frame into a single `nextPaused` call, so an
 * Escape that releases the lock and also fires keydown pauses exactly once.
 * `wasHeld` and `debug` are sticky from the latest note, the trigger flags are OR-ed.
 */
export function createPauseCollector(): PauseCollector {
  let pending: LockInputs | null = null
  return {
    note(partial) {
      const base = pending ?? NO_LOCK_INPUTS
      pending = {
        lockLost: base.lockLost || partial.lockLost === true,
        escapePressed: base.escapePressed || partial.escapePressed === true,
        tabHidden: base.tabHidden || partial.tabHidden === true,
        wasHeld: partial.wasHeld ?? base.wasHeld,
        debug: partial.debug ?? base.debug,
      }
    },
    decide(current) {
      if (!pending) return current
      const inputs = pending
      pending = null
      return nextPaused(current, inputs)
    },
  }
}

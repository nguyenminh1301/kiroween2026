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

/**
 * The pointer lock stays held in the game, also through a chapter card (paused, card up) and
 * act changes. It is released for pause, title, chapters, settings, credits and the Archive, and while the
 * act 3 choice shows, so the answers can be clicked.
 */
export function shouldHoldLock(screen: string, paused: boolean, card = false, choice = false): boolean {
  return screen === 'game' && (!paused || card) && !choice
}

export interface LockPromptInputs {
  screen: string
  paused: boolean
  card: boolean
  /** The act 3 choice is open: the pointer is free on purpose. */
  choice?: boolean
  locked: boolean
  /** The lock was taken for real at least once. */
  everLocked: boolean
  debug: boolean
}

/**
 * Show "Click to continue" when the game runs without the lock. Under ?debug the prompt waits
 * for a first real lock, so scripts that never lock are not covered.
 */
export function needsLockPrompt(i: LockPromptInputs): boolean {
  if (i.screen !== 'game' || i.paused || i.card || i.choice || i.locked) return false
  return i.everLocked || !i.debug
}

// A close-up task (dial, panel, keypad) that gives the player their body back when it ends.
// It ends when the task finishes, when the player presses Esc, or when they move too far away.
// Pure: no Three.js or React imports.

export interface CloseUp {
  isOpen(): boolean
  open(): boolean
  /** The task finished. */
  done(): void
  /** Esc, or the game paused. */
  esc(): void
  /** Call every frame with the distance from the eye to the task. Closes when beyond `maxDistance`. */
  tick(distance: number): void
}

export function createCloseUp(opts: { maxDistance: number; onClose: (why: 'done' | 'esc' | 'away') => void }): CloseUp {
  let open = false
  const close = (why: 'done' | 'esc' | 'away'): void => {
    if (!open) return
    open = false
    opts.onClose(why)
  }
  return {
    isOpen: () => open,
    open() {
      if (open) return false
      open = true
      return true
    },
    done: () => close('done'),
    esc: () => close('esc'),
    tick(distance) {
      if (open && !(distance <= opts.maxDistance)) close('away')
    },
  }
}

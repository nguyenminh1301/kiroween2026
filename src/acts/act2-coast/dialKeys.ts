// Borrow the movement keys for the gauge dial. No React or Three.js imports.

export interface MoveKeys {
  left: boolean
  right: boolean
  forward: boolean
  back: boolean
}

export interface Borrowed {
  /** Dial direction: +1 for D, -1 for A, 0 for both or neither. */
  dir: number
  /** Put the keys back, so a key still held keeps turning the dial next frame. */
  restore(): void
}

/**
 * Reads A and D as the dial direction, then clears all four movement keys so the player
 * step does not move the body. Held keys only change on key events, so `restore` must run
 * after the player step in the same frame, or a held key would count for one frame only.
 */
export function borrowMoveKeys(held: MoveKeys): Borrowed {
  const saved = { left: held.left, right: held.right, forward: held.forward, back: held.back }
  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0)
  held.left = held.right = held.forward = held.back = false
  return {
    dir,
    restore: () => Object.assign(held, saved),
  }
}

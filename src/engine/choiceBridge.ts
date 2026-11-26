// Lets the choice prompt (UI) hand the player's answer to the act that opened it. No React or Three.js imports.
export type DreamAnswer = 'dream' | 'fine'

let handler: ((c: DreamAnswer) => boolean) | null = null

export function setChoiceHandler(fn: ((c: DreamAnswer) => boolean) | null): void {
  handler = fn
}

/** Returns true when an open choice took the answer. */
export function pickChoice(c: DreamAnswer): boolean {
  return handler ? handler(c) : false
}

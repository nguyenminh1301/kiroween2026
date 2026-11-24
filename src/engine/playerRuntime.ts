// Runtime holder for the live player body. Plain module state, never React state.
// No React or Three.js imports.
import type { Vec3 } from '../types'
import { launch } from './movement'
import { setBody, type PlayerBody } from './playerBody'
import { gameStore } from './store'

let body: PlayerBody | null = null

/** The live body, or null while no act that has a player is loaded. */
export function getPlayerBody(): PlayerBody | null {
  return body
}

export function setPlayerBody(next: PlayerBody | null): void {
  body = next
}

/** Overwrites fields of the live body. A `mode` change is mirrored into the store. No-op without a body. */
export function updatePlayerBody(partial: Partial<PlayerBody>): void {
  if (!body) return
  body = setBody(body, partial)
  if (partial.mode !== undefined) gameStore.getState().setMoveMode(partial.mode)
}

/** Adds the zero-g launch impulse to the live body. No-op without a body. */
export function launchPlayer(dir: Vec3): void {
  if (!body) return
  body = launch(body, dir)
}

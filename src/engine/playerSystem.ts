// Frame system that drives the live player body. No React or Three.js imports.
import type { CleanupFn } from './cleanupRegistry'
import { consumeMouseMovement, inputState } from './inputRuntime'
import { getPlayerBody, setPlayerBody } from './playerRuntime'
import { stepPlayer, type PlayerStepConfig } from './playerStep'
import { setBody } from './playerBody'
import { addSystem } from './registerHelpers'
import { gameStore } from './store'

/** Before Focus (200), so a scripted look-at overrides mouse look. */
export const PLAYER_PRIORITY = 100

/**
 * Registers the player system for the loaded act. Each frame it follows the store's
 * `moveMode`, reads input and mouse look, and steps the body. Unload removes it.
 */
export function addPlayerSystem(cfg: PlayerStepConfig): CleanupFn {
  return addSystem(
    'player',
    PLAYER_PRIORITY,
    (dt) => {
      let body = getPlayerBody()
      if (!body) return
      const state = gameStore.getState()
      if (body.mode !== state.moveMode) body = setBody(body, { mode: state.moveMode })
      const mouse = consumeMouseMovement()
      setPlayerBody(stepPlayer(body, inputState, mouse, state.settings.sensitivity, dt, cfg))
    },
    { pausable: true },
  )
}

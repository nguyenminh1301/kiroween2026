import { createFocusController } from './focusRuntime'

/**
 * The one Focus controller the app uses. State is held in plain objects, never React
 * state. App wiring supplies the live body with `focus.setBodyAccess(...)`, and
 * debug.ts exposes `focus.isFocusActive` as `focus()`.
 */
export const focus = createFocusController()

export const focusOn = focus.focusOn
export const clearFocus = focus.clearFocus
export const isFocusActive = focus.isFocusActive

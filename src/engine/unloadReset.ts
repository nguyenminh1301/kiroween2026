// What the engine resets when an act unloads: the active Timeline ends, Focus
// clears, and the store fields an act may have changed go back to defaults.
import { clearFocus } from '../interaction/Focus'
import type { TimelinePlayer } from '../timeline/TimelinePlayer'
import { clearFx } from './fx'
import { gameStore } from './store'

let activeTimeline: TimelinePlayer | null = null

/** Called by TimelinePlayer.start so the unload reset can end it. */
export function trackTimeline(player: TimelinePlayer): void {
  activeTimeline = player
}

export function getActiveTimeline(): TimelinePlayer | null {
  return activeTimeline
}

export interface UnloadResetDeps {
  store?: typeof gameStore
  clearFocus?: () => void
}

/** Ends any Timeline and Focus, sets moveMode to 'walk', clears objective and target. Never throws. */
export function resetOnUnload(deps: UnloadResetDeps = {}): void {
  const store = deps.store ?? gameStore
  const clear = deps.clearFocus ?? clearFocus

  const timeline = activeTimeline
  activeTimeline = null
  try {
    timeline?.stop()
  } catch (err) {
    console.error('timeline stop failed', err)
  }
  try {
    clear()
  } catch (err) {
    console.error('focus clear failed', err)
  }
  const s = store.getState()
  s.setMoveMode('walk')
  s.setObjective(null)
  s.setTarget(null)
  clearFx()
}

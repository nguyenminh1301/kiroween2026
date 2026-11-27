// Hint slips: once per id per session, skipped when the objective names the same key unless the hint is marked `always`.
import { HINTS, type HintDef } from '../content/hints'
import { fxStore, type Hint } from '../engine/fx'
import { gameStore } from '../engine/store'

export const HINT_SECONDS = 6

export interface HintDeps {
  defs: Record<string, HintDef>
  objectiveKeys: () => string | undefined
  setHint: (h: Hint | null) => void
  getHint: () => Hint | null
  schedule: (fn: () => void, ms: number) => void
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().toUpperCase()

export function createHints(deps: HintDeps): { showHint(id: string): boolean; reset(): void } {
  const shown = new Set<string>()
  return {
    showHint(id) {
      const def = deps.defs[id]
      if (!def || shown.has(id)) return false
      const keys = deps.objectiveKeys()
      if (!def.always && keys !== undefined && norm(keys) === norm(def.key)) return false
      shown.add(id)
      const hint: Hint = { id, key: def.key, text: def.text }
      deps.setHint(hint)
      deps.schedule(() => {
        if (deps.getHint() === hint) deps.setHint(null)
      }, HINT_SECONDS * 1000)
      return true
    },
    reset: () => shown.clear(),
  }
}

const hints = createHints({
  defs: HINTS,
  objectiveKeys: () => gameStore.getState().objective?.keys,
  setHint: (h) => fxStore.getState().setHint(h),
  getHint: () => fxStore.getState().hint,
  schedule: (fn, ms) => void setTimeout(fn, ms),
})

/** Show a hint slip by id. Returns whether it was shown. */
export const showHint = hints.showHint

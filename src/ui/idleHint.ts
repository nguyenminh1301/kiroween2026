// A nudge for a player who has stopped. After IDLE_HINT_AFTER seconds with no input, while an
// objective is on screen, has not changed for OBJECTIVE_STALE_AFTER seconds, and no line is
// playing, the hint slip shows and stays until the player does something or a line starts.
// The decision is pure so it can be tested; `startIdleHint` wires it to the frame driver.
import { HINTS } from '../content/hints'
import { fxStore } from '../engine/fx'
import { registerSystem } from '../engine/frameDriver'
import { gameStore } from '../engine/store'

export const IDLE_HINT_AFTER = 20
/** The objective must have been the same this long, so the hint never points at an old one. */
export const OBJECTIVE_STALE_AFTER = 45
export const IDLE_HINT_ID = 'idle'

export interface IdleState {
  idle: number
  /** Seconds the current objective has been up. */
  objectiveAge?: number
  objectiveText?: string | null
}

export type IdleAction = 'show' | 'clear' | null

export interface IdleContext {
  /** In a run, not paused, no chapter card, and an objective is showing. */
  active: boolean
  /** The idle hint is on screen now. */
  shown: boolean
  /** The player pressed a key or moved the mouse since the last step. */
  input: boolean
  /** The current objective text, to notice a change. */
  objectiveText?: string | null
  /** A line is playing or showing as a subtitle. */
  linePlaying?: boolean
}

/** Advance the idle timer by `dt` seconds. Mutates `state`. */
export function idleStep(state: IdleState, dt: number, ctx: IdleContext): IdleAction {
  const text = ctx.objectiveText ?? null
  if (state.objectiveText !== text) {
    state.objectiveText = text
    state.objectiveAge = 0
  } else if (ctx.active) {
    state.objectiveAge = (state.objectiveAge ?? 0) + dt
  }
  if (ctx.shown && ctx.linePlaying) return 'clear'
  if (ctx.input || !ctx.active) {
    state.idle = 0
    return ctx.shown ? 'clear' : null
  }
  state.idle += dt
  const fresh = ctx.objectiveText === undefined || (state.objectiveAge ?? 0) >= OBJECTIVE_STALE_AFTER
  if (state.idle >= IDLE_HINT_AFTER && fresh && !ctx.linePlaying && !ctx.shown) return 'show'
  return null
}

/** Listens for input and runs the idle timer on the frame driver. Returns a stop function. */
export function startIdleHint(win: Window = window): () => void {
  let input = false
  const mark = (): void => {
    input = true
  }
  const events = ['keydown', 'mousedown', 'mousemove', 'wheel'] as const
  events.forEach((e) => win.addEventListener(e, mark, { passive: true }))
  const state: IdleState = { idle: 0 }
  const remove = registerSystem('idle-hint', 900, (dt) => {
    const g = gameStore.getState()
    const fx = fxStore.getState()
    const ctx: IdleContext = {
      active: g.screen === 'game' && !g.paused && !fx.card && !!g.objective,
      shown: fx.hint?.id === IDLE_HINT_ID,
      input,
      objectiveText: g.objective?.text ?? null,
      linePlaying: g.subtitle !== null,
    }
    input = false
    const action = idleStep(state, dt, ctx)
    if (action === 'show') {
      const def = HINTS[IDLE_HINT_ID]
      fx.setHint({ id: IDLE_HINT_ID, key: g.objective?.keys ?? def.key, text: def.text })
    } else if (action === 'clear') {
      fx.setHint(null)
    }
  })
  return () => {
    remove()
    events.forEach((e) => win.removeEventListener(e, mark))
  }
}

// Pure input state machine. No DOM, Three.js or React imports.

export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'use'
  | 'lookBack'
  | 'holdBreath'
  | 'closeEyes'
  | 'wrist'
  | 'pause'

export const ACTIONS: readonly Action[] = [
  'forward',
  'back',
  'left',
  'right',
  'use',
  'lookBack',
  'holdBreath',
  'closeEyes',
  'wrist',
  'pause',
]

export const KEY_MAP: Readonly<Record<string, Action>> = Object.freeze({
  KeyW: 'forward',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  KeyE: 'use',
  KeyQ: 'lookBack',
  Space: 'holdBreath',
  KeyC: 'closeEyes',
  KeyF: 'wrist',
  Escape: 'pause',
})

/** Space is both holdBreath and the jump trigger; movement code uses it as a jump only where enabled. */
export const JUMP_ACTION: Action = 'holdBreath'

export const MOUSE_SCALE = 0.002
export const MOUSE_EVENT_LIMIT = 400
export const LOCK_GUARD_MS = 150

export interface InputState {
  held: Record<Action, boolean>
  pressed: Record<Action, boolean>
  /** True while a left-button press that started under lock is still down. */
  mouseUse: boolean
}

function blank(): Record<Action, boolean> {
  return {
    forward: false,
    back: false,
    left: false,
    right: false,
    use: false,
    lookBack: false,
    holdBreath: false,
    closeEyes: false,
    wrist: false,
    pause: false,
  }
}

export function createInputState(): InputState {
  return { held: blank(), pressed: blank(), mouseUse: false }
}

function lookup(code: string): Action | undefined {
  return Object.prototype.hasOwnProperty.call(KEY_MAP, code) ? KEY_MAP[code] : undefined
}

export function applyKeyDown(state: InputState, code: string): void {
  const action = lookup(code)
  if (!action) return
  if (!state.held[action]) state.pressed[action] = true
  state.held[action] = true
}

export function applyKeyUp(state: InputState, code: string): void {
  const action = lookup(code)
  if (!action) return
  state.held[action] = false
  // A mouse hold on `use` survives releasing the E key.
  if (action === 'use' && state.mouseUse) state.held.use = true
}

export function clearAllHeld(state: InputState): void {
  for (const a of ACTIONS) state.held[a] = false
  state.mouseUse = false
}

export function endFrame(state: InputState): void {
  for (const a of ACTIONS) state.pressed[a] = false
}

export function applyMouseDown(state: InputState, locked: boolean): void {
  if (!locked) return
  if (!state.held.use) state.pressed.use = true
  state.held.use = true
  state.mouseUse = true
}

export function applyMouseUp(state: InputState): void {
  if (!state.mouseUse) return
  state.mouseUse = false
  state.held.use = false
}

export interface MouseLookState {
  yaw: number
  pitch: number
}

/** Pure: yaw/pitch change by -movement * 0.002 * sensitivity. */
export function applyMouseLook(
  s: MouseLookState,
  movementX: number,
  movementY: number,
  sensitivity: number,
): MouseLookState {
  const k = MOUSE_SCALE * sensitivity
  return { yaw: s.yaw - movementX * k, pitch: s.pitch - movementY * k }
}

/** True if the event is accepted (both magnitudes at most 400). */
export function filterMouseEvent(movementX: number, movementY: number): boolean {
  if (!Number.isFinite(movementX) || !Number.isFinite(movementY)) return false
  return Math.abs(movementX) <= MOUSE_EVENT_LIMIT && Math.abs(movementY) <= MOUSE_EVENT_LIMIT
}

/** True while the clock is inside the 150 ms window after a lock change. */
export function isWithinLockGuard(lockChangeAtMs: number, nowMs: number): boolean {
  return nowMs - lockChangeAtMs < LOCK_GUARD_MS
}

export interface MouseContext {
  locked: boolean
  focusActive: boolean
  /** Monotonic ms of the last lock change, or null if none yet. */
  lockChangeAtMs: number | null
  nowMs: number
}

export interface MouseAccumulator {
  x: number
  y: number
}

/**
 * Focus- and lock-aware accumulation. Adds the event's movement to `acc` only when
 * locked, no Focus is active, outside the lock guard, and the event passes the filter.
 * Returns whether the event was accepted.
 */
export function accumulateMouse(
  acc: MouseAccumulator,
  movementX: number,
  movementY: number,
  ctx: MouseContext,
): boolean {
  if (!ctx.locked || ctx.focusActive) return false
  if (ctx.lockChangeAtMs !== null && isWithinLockGuard(ctx.lockChangeAtMs, ctx.nowMs)) return false
  if (!filterMouseEvent(movementX, movementY)) return false
  acc.x += movementX
  acc.y += movementY
  return true
}

/**
 * Focus-aware look: while a Focus is active the movement is discarded and the
 * look state is returned unchanged.
 */
export function applyMouseLookUnlessFocused(
  s: MouseLookState,
  movementX: number,
  movementY: number,
  sensitivity: number,
  focusActive: boolean,
): MouseLookState {
  if (focusActive) return s
  return applyMouseLook(s, movementX, movementY, sensitivity)
}

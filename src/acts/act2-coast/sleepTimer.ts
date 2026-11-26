// The act 2 bedtime: hold C, the view fades to black over two seconds and the hum drops. A few quiet seconds
// later the act ends. No breathing, no flashes, no stings.
// Driven by `tick(dt, closed)`. Pure: effects are injected, so a test can run it on a fake clock.
// No Three.js or React imports.

export const FADE_SECONDS = 2
export const OPEN_SECONDS = 0.6
/** Quiet seconds in the dark before the act ends. */
export const QUIET_SECONDS = 4
/** Total seconds with eyes closed when the act ends. */
export const COMPLETE_AT = FADE_SECONDS + QUIET_SECONDS

export interface SleepDeps {
  setBlackout(v: number): void
  /** Cabin hum level, 1 awake, near 0 in the dark. */
  setHum(level: number): void
  complete(): void
}

export interface SleepTimer {
  tick(dt: number, closed: boolean): void
  /** Total seconds with eyes closed. */
  closedTime(): number
  blackout(): number
  finished(): boolean
}

export function createSleepTimer(deps: SleepDeps): SleepTimer {
  let total = 0
  let blackout = 0
  let completed = false
  return {
    tick(dt, closed) {
      if (!(dt > 0) || completed) return
      const step = dt / (closed ? FADE_SECONDS : OPEN_SECONDS)
      const next = Math.min(1, Math.max(0, blackout + (closed ? step : -step)))
      if (next !== blackout) {
        blackout = next
        deps.setBlackout(blackout)
        deps.setHum(1 - 0.9 * blackout)
      }
      if (!closed) return
      total += dt
      if (total >= COMPLETE_AT) {
        completed = true
        deps.complete()
      }
    },
    closedTime: () => total,
    blackout: () => blackout,
    finished: () => completed,
  }
}

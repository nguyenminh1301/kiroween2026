// The act 2 bedtime: hold C, the view fades to black over two seconds, the hum drops, and in the dark there
// is slow breathing. A careful listener counts four rhythms, not three. Eyes closed for 6 s in a row marks the
// fourth sleeper. Nothing flashes and nothing stings.
// Driven by `tick(dt, closed)`. Pure: effects are injected, so a test can run it on a fake clock.
// No Three.js or React imports.

export const FADE_SECONDS = 2
export const OPEN_SECONDS = 0.6
/** Continuous seconds with eyes closed that count as listening closely. */
export const NOTICE_AT = 6
/** Total seconds with eyes closed when the act ends. */
export const COMPLETE_AT = 12
/** Breath rhythm periods in seconds: the commander, the pilot, the player, and the one in the empty corner. */
export const RHYTHMS = [3.6, 4.1, 4.7, 5.3] as const
/** Blackout level at which the breathing can be heard. */
export const BREATH_FROM = 0.4

export interface SleepDeps {
  setBlackout(v: number): void
  /** Cabin hum level, 1 awake, near 0 in the dark. */
  setHum(level: number): void
  /** One breath of rhythm `index` (0 to 3). Index 3 is the fourth sleeper. */
  breathe(index: number): void
  fourthSleeper(): void
  complete(): void
}

export interface SleepTimer {
  tick(dt: number, closed: boolean): void
  /** Total seconds with eyes closed. */
  closedTime(): number
  /** Seconds in a row with eyes closed. */
  streak(): number
  blackout(): number
  finished(): boolean
}

export function createSleepTimer(deps: SleepDeps): SleepTimer {
  let total = 0
  let streak = 0
  let blackout = 0
  let noticed = false
  let completed = false
  // Stagger the first breaths so the four never line up.
  const left = RHYTHMS.map((p, i) => p * (0.25 + 0.2 * i))
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
      if (!closed) {
        streak = 0
        return
      }
      total += dt
      streak += dt
      if (blackout >= BREATH_FROM) {
        for (let i = 0; i < RHYTHMS.length; i++) {
          left[i] -= dt
          if (left[i] <= 0) {
            left[i] += RHYTHMS[i]
            deps.breathe(i)
          }
        }
      }
      if (!noticed && streak >= NOTICE_AT) {
        noticed = true
        deps.fourthSleeper()
      }
      if (total >= COMPLETE_AT) {
        completed = true
        deps.complete()
      }
    },
    closedTime: () => total,
    streak: () => streak,
    blackout: () => blackout,
    finished: () => completed,
  }
}

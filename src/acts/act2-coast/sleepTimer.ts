// The act 2 sleep: blackout, flashes, whispers, breathing and the fourth sleeper.
// Driven by `tick(dt, closed)`. Pure: effects and randomness are injected, so a test can
// run it on a fake clock. No Three.js or React imports.
import type { Flash } from '../../engine/fx'

export const BLACKOUT_SECONDS = 0.33
export const FLASHES_LINE_AT = 1.5
export const BREATH_LINE_AT = 4
export const FIGURE_AT = 11
export const COMPLETE_DELAY = 1.2
export const FIGURE_SHOWN = 0.8
export const MAX_FLASHES = 6

export type WhisperId = 'act2.flashes' | 'act2.breath'

export interface SleepDeps {
  rng(): number
  whisper(id: WhisperId): void
  setBlackout(v: number): void
  setFlashes(f: Flash[]): void
  /** The `breathe` sound from the empty corner. */
  breathe(): void
  fourthSleeper(): void
  complete(): void
}

export interface SleepTimer {
  tick(dt: number, closed: boolean): void
  closedTime(): number
  blackout(): number
  flashCount(): number
  finished(): boolean
}

export function createSleepTimer(deps: SleepDeps): SleepTimer {
  const range = (lo: number, hi: number): number => lo + deps.rng() * (hi - lo)
  let closedTime = 0
  let blackout = 0
  let flashes: Flash[] = []
  let flashLeft = range(0.4, 1.3)
  let breathLeft = range(2.2, 3.2)
  let saidFlashes = false
  let saidBreath = false
  let wasClosed = false
  let figureAt: number | null = null
  let completeLeft = 0
  let completed = false

  const push = (f: Flash): void => {
    flashes = [...flashes, f].slice(-MAX_FLASHES)
    deps.setFlashes(flashes)
  }

  return {
    tick(dt, closed) {
      if (!(dt > 0)) return
      const step = dt / BLACKOUT_SECONDS
      const next = Math.min(1, Math.max(0, blackout + (closed ? step : -step)))
      if (next !== blackout) {
        blackout = next
        deps.setBlackout(blackout)
      }

      if (figureAt !== null) {
        figureAt += dt
        if (figureAt >= FIGURE_SHOWN) {
          figureAt = null
          flashes = flashes.filter((f) => !f.figure)
          deps.setFlashes(flashes)
        }
      }
      if (completeLeft > 0) {
        completeLeft -= dt
        if (completeLeft <= 0 && !completed) {
          completed = true
          deps.complete()
        }
      }

      if (!closed) {
        if (wasClosed && flashes.length > 0 && figureAt === null) {
          flashes = []
          deps.setFlashes(flashes)
        }
        wasClosed = false
        return
      }
      wasClosed = true
      if (closedTime >= FIGURE_AT) return

      closedTime += dt
      if (!saidFlashes && closedTime >= FLASHES_LINE_AT) {
        saidFlashes = true
        deps.whisper('act2.flashes')
      }
      if (!saidBreath && closedTime >= BREATH_LINE_AT) {
        saidBreath = true
        deps.whisper('act2.breath')
      }

      flashLeft -= dt
      if (flashLeft <= 0) {
        flashLeft += range(0.4, 1.3)
        push({ x: range(0.08, 0.92), y: range(0.1, 0.9), size: range(0.03, 0.09) })
      }
      breathLeft -= dt
      if (breathLeft <= 0) {
        breathLeft += range(2.2, 3.2)
        deps.breathe()
      }

      if (closedTime >= FIGURE_AT) {
        push({ x: 0.5, y: 0.5, size: 4, figure: true })
        figureAt = 0
        deps.fourthSleeper()
        completeLeft = COMPLETE_DELAY
      }
    },
    closedTime: () => closedTime,
    blackout: () => blackout,
    flashCount: () => flashes.length,
    finished: () => completed,
  }
}

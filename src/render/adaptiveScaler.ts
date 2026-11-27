import { registerSystem } from '../engine/frameDriver'
import { gameStore } from '../engine/store'
import { onRenderHold, holdRender } from '../engine/renderHold'
import { UP_BLOCK_MS, nextLevel } from './adaptiveDecision'
import { DEFAULT_LEVEL, levelCount, lowestLevelAtLeast } from './levelTable'
import { pictureRange, type Picture } from './pictureRange'

export const MAX_SAMPLES = 600
export const DECISION_MS = 500
export const MAX_SAMPLE_MS = 1000
export const ADAPTIVE_SCALER_PRIORITY = 850

/** The scaler never goes below 640x360 by itself. */
export const AUTO_FLOOR_WIDTH = 640

export interface ScalerDeps {
  initialLevel?: number
  isPaused?: () => boolean
}

export interface AdaptiveScaler {
  /** Advance by one frame of unpaused time, in milliseconds. */
  step(frameMs: number): void
  getLevel(): number
  setLevel(n: number): void
  setAuto(on: boolean): void
  isAuto(): boolean
  /** Ignore frame times for `ms` of unpaused time and drop the samples so far. */
  hold(ms: number): void
  /** Allowed levels: `top` is the sharpest, `floor` the lowest. Clamps the current level. */
  setRange(top: number, floor: number): void
  getRange(): { top: number; floor: number }
  /**
   * Set the range and start level for a picture setting and a view width in real pixels.
   * A new picture setting, or the first call, goes to the start level. A resize keeps the level
   * the scaler found, inside the new range.
   */
  configure(picture: Picture, viewPx: number): void
  sampleCount(): number
  msSinceChange(): number
  subscribe(listener: (level: number) => void): () => void
}

export function createAdaptiveScaler(deps: ScalerDeps = {}): AdaptiveScaler {
  const isPaused = deps.isPaused ?? (() => false)
  let level = deps.initialLevel ?? DEFAULT_LEVEL
  let auto = true
  let samples: number[] = []
  let msSinceChange = 0
  let msSinceDecision = 0
  let holdLeft = 0
  let picture: Picture | null = null
  let moved = false
  let msSinceDrop = Infinity
  let top = 0
  let floor = lowestLevelAtLeast(AUTO_FLOOR_WIDTH)
  const listeners = new Set<(level: number) => void>()

  function change(n: number): void {
    level = n
    samples = []
    msSinceChange = 0
    for (const l of [...listeners]) l(level)
  }

  return {
    step(frameMs) {
      if (isPaused()) return
      if (!Number.isFinite(frameMs) || frameMs < 0 || frameMs > MAX_SAMPLE_MS) return
      msSinceDrop += frameMs
      if (holdLeft > 0) {
        holdLeft -= frameMs
        return
      }
      samples.push(frameMs)
      if (samples.length > MAX_SAMPLES) samples.shift()
      msSinceChange += frameMs
      msSinceDecision += frameMs
      if (!auto || msSinceDecision < DECISION_MS) return
      msSinceDecision = 0
      const n = nextLevel(level, samples, msSinceChange, { top, floor, upBlocked: msSinceDrop < UP_BLOCK_MS })
      if (n !== level) {
        if (n > level) msSinceDrop = 0
        moved = true
        change(n)
      }
    },
    hold(ms) {
      holdLeft = Math.max(holdLeft, Number.isFinite(ms) ? ms : 0)
      samples = []
      msSinceChange = 0
      msSinceDecision = 0
    },
    setRange(t, f) {
      if (!Number.isInteger(t) || !Number.isInteger(f) || t < 0 || f >= levelCount() || t > f) return
      top = t
      floor = f
      if (level < top) change(top)
      else if (level > floor) change(floor)
    },
    getRange: () => ({ top, floor }),
    configure(p, viewPx) {
      const r = pictureRange(p, viewPx)
      const fresh = picture !== p || !moved
      picture = p
      top = r.top
      floor = r.floor
      if (fresh) {
        moved = false
        msSinceDrop = Infinity
        if (level !== r.start) change(r.start)
        else msSinceChange = 0
      } else if (level < top) change(top)
      else if (level > floor) change(floor)
    },
    getLevel: () => level,
    setLevel(n) {
      if (!Number.isInteger(n) || n < 0 || n >= levelCount()) return
      if (n === level) {
        msSinceChange = 0
        return
      }
      change(n)
    },
    setAuto(on) {
      auto = on === true
      if (auto) {
        samples = []
        msSinceChange = 0
      }
    },
    isAuto: () => auto,
    sampleCount: () => samples.length,
    msSinceChange: () => msSinceChange,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** The one scaler. Its level survives act loads and unloads. */
export const adaptiveScaler = createAdaptiveScaler({ isPaused: () => gameStore.getState().paused })

// Act changes and a resume from pause say nothing about the picture. Loads and cuts call holdRender too.
onRenderHold((ms) => adaptiveScaler.hold(ms))
gameStore.subscribe((s, prev) => {
  if (s.act !== prev.act || (prev.paused && !s.paused)) holdRender()
})

/** Registers the scaler's frame callback. Call once at app start; returns the remover. */
export function registerAdaptiveScaler(): () => void {
  return registerSystem(
    'adaptive-scaler',
    ADAPTIVE_SCALER_PRIORITY,
    (dt) => adaptiveScaler.step(dt * 1000),
    { pausable: true },
  )
}

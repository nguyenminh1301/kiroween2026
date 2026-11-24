import { registerSystem } from '../engine/frameDriver'
import { gameStore } from '../engine/store'
import { nextLevel } from './adaptiveDecision'
import { DEFAULT_LEVEL, levelCount } from './levelTable'

export const MAX_SAMPLES = 600
export const DECISION_MS = 500
export const MAX_SAMPLE_MS = 1000
export const ADAPTIVE_SCALER_PRIORITY = 850

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
      samples.push(frameMs)
      if (samples.length > MAX_SAMPLES) samples.shift()
      msSinceChange += frameMs
      msSinceDecision += frameMs
      if (!auto || msSinceDecision < DECISION_MS) return
      msSinceDecision = 0
      const n = nextLevel(level, samples, msSinceChange)
      if (n !== level) change(n)
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

/** Registers the scaler's frame callback. Call once at app start; returns the remover. */
export function registerAdaptiveScaler(): () => void {
  return registerSystem(
    'adaptive-scaler',
    ADAPTIVE_SCALER_PRIORITY,
    (dt) => adaptiveScaler.step(dt * 1000),
    { pausable: true },
  )
}

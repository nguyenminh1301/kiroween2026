import type { ActId } from '../types'
import { ACT_ORDER } from './actOrder'

export interface Settings {
  sensitivity: number
  volume: number
  subtitleScale: number
  reducedMotion: boolean
}

export type NumericSettingKey = 'sensitivity' | 'volume' | 'subtitleScale'

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  volume: 1,
  subtitleScale: 1,
  reducedMotion: false,
}

export const SETTINGS_DEFAULTS = DEFAULT_SETTINGS

export const SETTINGS_RANGES: Record<NumericSettingKey, readonly [number, number]> = {
  sensitivity: [0.2, 3],
  volume: [0, 1],
  subtitleScale: [0.8, 1.6],
}

/** Clamp a number into the key's range. Non-finite or non-number input keeps `previous`. */
export function clampSetting(key: NumericSettingKey, value: unknown, previous: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return previous
  const [lo, hi] = SETTINGS_RANGES[key]
  return Math.min(hi, Math.max(lo, value))
}

/** Non-boolean input keeps `previous`. */
export function clampReducedMotion(value: unknown, previous: boolean): boolean {
  return typeof value === 'boolean' ? value : previous
}

/** Apply a partial update on top of `current`, clamping each field. */
export function applySettings(current: Settings, partial: Partial<Settings>): Settings {
  return {
    sensitivity: clampSetting('sensitivity', partial.sensitivity, current.sensitivity),
    volume: clampSetting('volume', partial.volume, current.volume),
    subtitleScale: clampSetting('subtitleScale', partial.subtitleScale, current.subtitleScale),
    reducedMotion: clampReducedMotion(partial.reducedMotion, current.reducedMotion),
  }
}

export interface SavedShape {
  settings: Settings
  unlockedActs: ActId[]
}

export function serializeSaved(saved: SavedShape): string {
  return JSON.stringify({
    settings: { ...saved.settings },
    unlockedActs: [...saved.unlockedActs],
  })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Strict per-field check: out of range or wrong type falls back to the default for that field. */
function strictNumber(key: NumericSettingKey, value: unknown): number {
  const fallback = DEFAULT_SETTINGS[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const [lo, hi] = SETTINGS_RANGES[key]
  return value < lo || value > hi ? fallback : value
}

function sanitizeSettings(raw: unknown): Settings {
  const o = isRecord(raw) ? raw : {}
  return {
    sensitivity: strictNumber('sensitivity', o.sensitivity),
    volume: strictNumber('volume', o.volume),
    subtitleScale: strictNumber('subtitleScale', o.subtitleScale),
    reducedMotion:
      typeof o.reducedMotion === 'boolean' ? o.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
  }
}

function sanitizeUnlocked(raw: unknown): ActId[] {
  const set = new Set<ActId>(['act0-pad'])
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const known = ACT_ORDER.find((id) => id === item)
      if (known) set.add(known)
    }
  }
  return ACT_ORDER.filter((id) => set.has(id))
}

/** Never throws. Always returns a fully valid SavedShape. */
export function parseSaved(raw: string | null): SavedShape {
  let data: unknown = null
  try {
    if (typeof raw === 'string') data = JSON.parse(raw)
  } catch {
    data = null
  }
  const o = isRecord(data) ? data : {}
  return {
    settings: sanitizeSettings(o.settings),
    unlockedActs: sanitizeUnlocked(o.unlockedActs),
  }
}

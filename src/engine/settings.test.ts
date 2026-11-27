import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { ActId } from '../types'
import { ACT_ORDER } from './actOrder'
import {
  DEFAULT_SETTINGS,
  SETTINGS_RANGES,
  applySettings,
  parseSaved,
  serializeSaved,
  type NumericSettingKey,
  type SavedShape,
  type Settings,
} from './settings'
import { gameStore } from './store'

const RUNS = { numRuns: 200 }
const KEYS: NumericSettingKey[] = ['sensitivity', 'volume', 'subtitleScale']

const anyNumber = fc.oneof(
  fc.double({ noNaN: false }),
  fc.constantFrom(NaN, Infinity, -Infinity, 0, -0, 1e308, -1e308),
)
const anyValue = fc.oneof(
  anyNumber,
  fc.string(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.array(fc.integer()),
)

const inRange = (key: NumericSettingKey) =>
  fc.double({
    min: SETTINGS_RANGES[key][0],
    max: SETTINGS_RANGES[key][1],
    noNaN: true,
  })

const validSettings: fc.Arbitrary<Settings> = fc.record({
  sensitivity: inRange('sensitivity'),
  volume: inRange('volume'),
  subtitleScale: inRange('subtitleScale'),
  reducedMotion: fc.boolean(),
  prints: fc.boolean(),
  picture: fc.constantFrom('sharp', 'balanced', 'retro'),
})

const validSaved: fc.Arbitrary<SavedShape> = fc
  .record({
    settings: validSettings,
    extra: fc.subarray([...ACT_ORDER]),
  })
  .map(({ settings, extra }) => ({
    settings,
    unlockedActs: ACT_ORDER.filter((id) => id === 'act0-pad' || extra.includes(id)) as ActId[],
  }))

describe('settings defaults', () => {
  it('matches the spec', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      sensitivity: 1,
      volume: 1,
      subtitleScale: 1,
      reducedMotion: false,
      prints: true,
      picture: 'sharp',
    })
    expect(SETTINGS_RANGES.sensitivity).toEqual([0.2, 3])
    expect(SETTINGS_RANGES.volume).toEqual([0, 1])
    expect(SETTINGS_RANGES.subtitleScale).toEqual([0.8, 1.6])
  })
})

describe('settings setters', () => {
  // Feature: engine-core, Property 13: numeric setters clamp finite input, keep previous otherwise
  it('Property 13: clamps finite numbers and keeps previous on invalid input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KEYS),
        fc.boolean(),
        anyValue,
        anyValue,
        (key, reduced, input, reducedInput) => {
          const prev: Settings = { ...DEFAULT_SETTINGS, [key]: SETTINGS_RANGES[key][0] + 0.1 }
          prev.reducedMotion = reduced
          const next = applySettings(prev, { [key]: input, reducedMotion: reducedInput } as never)
          const [lo, hi] = SETTINGS_RANGES[key]
          if (typeof input === 'number' && Number.isFinite(input)) {
            expect(next[key]).toBe(Math.min(hi, Math.max(lo, input)))
          } else {
            expect(next[key]).toBe(prev[key])
          }
          expect(next.reducedMotion).toBe(typeof reducedInput === 'boolean' ? reducedInput : reduced)
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 13: store setSettings uses the same clamping
  it('Property 13: store setSettings clamps through the store', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KEYS), anyNumber, (key, input) => {
        gameStore.setState({ settings: { ...DEFAULT_SETTINGS } })
        gameStore.getState().setSettings({ [key]: input })
        const [lo, hi] = SETTINGS_RANGES[key]
        const got = gameStore.getState().settings[key]
        expect(got).toBe(Number.isFinite(input) ? Math.min(hi, Math.max(lo, input)) : DEFAULT_SETTINGS[key])
      }),
      RUNS,
    )
  })
})

describe('settings parsing', () => {
  // Feature: engine-core, Property 14: parseSaved(serializeSaved(x)) == x for valid SavedShape
  it('Property 14: round-trips valid saved objects', () => {
    fc.assert(
      fc.property(validSaved, (x) => {
        expect(parseSaved(serializeSaved(x))).toEqual(x)
      }),
      RUNS,
    )
  })

  function assertValid(s: SavedShape): void {
    for (const key of KEYS) {
      const [lo, hi] = SETTINGS_RANGES[key]
      expect(Number.isFinite(s.settings[key])).toBe(true)
      expect(s.settings[key]).toBeGreaterThanOrEqual(lo)
      expect(s.settings[key]).toBeLessThanOrEqual(hi)
    }
    expect(typeof s.settings.reducedMotion).toBe('boolean')
    expect(typeof s.settings.prints).toBe('boolean')
    expect(s.unlockedActs).toContain('act0-pad')
    expect(new Set(s.unlockedActs).size).toBe(s.unlockedActs.length)
    for (const id of s.unlockedActs) expect(ACT_ORDER).toContain(id)
  }

  // Feature: engine-core, Property 15: parseSaved never throws and always returns in-range values
  it('Property 15: arbitrary strings never throw and yield valid output', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json(), fc.constant(null)), (raw) => {
        assertValid(parseSaved(raw))
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 15: wrong-shape JSON falls back per field
  it('Property 15: wrong-shape JSON values yield valid output', () => {
    fc.assert(
      fc.property(fc.jsonValue(), anyValue, anyValue, (v, a, b) => {
        assertValid(parseSaved(JSON.stringify(v)))
        assertValid(
          parseSaved(
            JSON.stringify({
              settings: { sensitivity: a, volume: b, subtitleScale: a, reducedMotion: b },
              unlockedActs: [a, b, 'act3-farside', 'act3-farside', 'bogus'],
            }),
          ),
        )
      }),
      RUNS,
    )
  })

  it('returns defaults for invalid JSON and non-objects', () => {
    for (const raw of ['{oops', 'null', '[1,2]', '42', '"x"', '', null]) {
      expect(parseSaved(raw)).toEqual({ settings: DEFAULT_SETTINGS, unlockedActs: ['act0-pad'] })
    }
  })

  it('replaces only the bad field and keeps the valid ones', () => {
    const raw = JSON.stringify({
      settings: { sensitivity: 99, volume: 0.5, subtitleScale: 'big', reducedMotion: true },
      unlockedActs: ['act2-coast', 'nope'],
    })
    expect(parseSaved(raw)).toEqual({
      settings: { sensitivity: 1, volume: 0.5, subtitleScale: 1, reducedMotion: true, prints: true, picture: 'sharp' },
      unlockedActs: ['act0-pad', 'act2-coast'],
    })
  })
})

describe('picture setting', () => {
  it('keeps a known value, ignores an unknown one, and survives a save and load', () => {
    expect(applySettings(DEFAULT_SETTINGS, { picture: 'retro' }).picture).toBe('retro')
    expect(applySettings(DEFAULT_SETTINGS, { picture: 'ultra' as never }).picture).toBe('sharp')
    const saved = serializeSaved({ settings: { ...DEFAULT_SETTINGS, picture: 'balanced' }, unlockedActs: ['act0-pad'] })
    expect(parseSaved(saved).settings.picture).toBe('balanced')
    expect(parseSaved(JSON.stringify({ settings: { picture: 5 } })).settings.picture).toBe('sharp')
  })
})

describe('flickerScale', () => {
  it('is 1 normally and 0.3 with reduced motion', async () => {
    const { flickerScale } = await import('./settings')
    expect(flickerScale(false)).toBe(1)
    expect(flickerScale(true)).toBeCloseTo(0.3)
  })
})

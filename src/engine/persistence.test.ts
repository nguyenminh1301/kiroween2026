import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, readRaw, startPersistence, writeRaw } from './persistence'
import { DEFAULT_SETTINGS, serializeSaved } from './settings'
import { gameStore } from './store'

function memoryStorage(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

let stop: (() => void) | null = null

beforeEach(() => {
  gameStore.setState({ settings: { ...DEFAULT_SETTINGS }, unlockedActs: ['act0-pad'] })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  stop?.()
  stop = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('persistence', () => {
  it('uses the documented storage key', () => {
    expect(STORAGE_KEY).toBe('loss-of-signal:v1')
  })

  it('loads saved settings and unlocked acts at start', () => {
    const storage = memoryStorage(
      serializeSaved({
        settings: { ...DEFAULT_SETTINGS, volume: 0.4, reducedMotion: true },
        unlockedActs: ['act0-pad', 'act1-launch'],
      }),
    )
    stop = startPersistence(gameStore, storage)
    expect(gameStore.getState().settings.volume).toBe(0.4)
    expect(gameStore.getState().settings.reducedMotion).toBe(true)
    expect(gameStore.getState().unlockedActs).toEqual(['act0-pad', 'act1-launch'])
  })

  it('writes on settings and unlockedActs change, not on other changes', () => {
    const storage = memoryStorage()
    stop = startPersistence(gameStore, storage)
    expect(storage.data.has(STORAGE_KEY)).toBe(false)

    gameStore.getState().setPaused(true)
    expect(storage.data.has(STORAGE_KEY)).toBe(false)

    gameStore.getState().setSettings({ sensitivity: 2 })
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).settings.sensitivity).toBe(2)

    gameStore.getState().setUnlockedActs(['act0-pad', 'act2-coast'])
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).unlockedActs).toEqual(['act0-pad', 'act2-coast'])
  })

  it('stops writing after unsubscribe', () => {
    const storage = memoryStorage()
    startPersistence(gameStore, storage)()
    gameStore.getState().setSettings({ volume: 0.1 })
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
  })

  it('survives a throwing getItem and keeps defaults', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: vi.fn(),
    }
    expect(() => {
      stop = startPersistence(gameStore, storage)
    }).not.toThrow()
    expect(gameStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(readRaw(storage)).toBeNull()
  })

  it('survives a throwing setItem on change', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    stop = startPersistence(gameStore, storage)
    expect(() => gameStore.getState().setSettings({ volume: 0.2 })).not.toThrow()
    expect(gameStore.getState().settings.volume).toBe(0.2)
    expect(writeRaw('x', storage)).toBe(false)
  })

  it('works when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => {
      stop = startPersistence(gameStore)
    }).not.toThrow()
    expect(() => gameStore.getState().setSettings({ volume: 0.3 })).not.toThrow()
    expect(gameStore.getState().settings.volume).toBe(0.3)
    expect(readRaw()).toBeNull()
    expect(writeRaw('x')).toBe(false)
  })

  it('works when accessing localStorage throws', () => {
    vi.stubGlobal('localStorage', undefined)
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied')
      },
    })
    expect(() => {
      stop = startPersistence(gameStore)
    }).not.toThrow()
    expect(gameStore.getState().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults for corrupt stored text', () => {
    stop = startPersistence(gameStore, memoryStorage('{not json'))
    expect(gameStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(gameStore.getState().unlockedActs).toEqual(['act0-pad'])
  })
})

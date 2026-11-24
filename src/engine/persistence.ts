import type { StoreApi } from 'zustand/vanilla'
import type { GameState } from './store'
import { parseSaved, serializeSaved } from './settings'

export const STORAGE_KEY = 'loss-of-signal:v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const warned = new Set<string>()
function warnOnce(kind: string, err: unknown): void {
  if (warned.has(kind)) return
  warned.add(kind)
  console.warn(`persistence: ${kind} failed`, err)
}

/** Returns the storage object, or null when it is missing or access throws. */
function getStorage(): StorageLike | null {
  try {
    const s = typeof localStorage === 'undefined' ? undefined : localStorage
    return s ?? null
  } catch (err) {
    warnOnce('access', err)
    return null
  }
}

/** Raw read. Returns null on any failure. */
export function readRaw(storage: StorageLike | null = getStorage()): string | null {
  if (!storage) return null
  try {
    return storage.getItem(STORAGE_KEY)
  } catch (err) {
    warnOnce('read', err)
    return null
  }
}

/** Raw write. Returns false on any failure. */
export function writeRaw(value: string, storage: StorageLike | null = getStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, value)
    return true
  } catch (err) {
    warnOnce('write', err)
    return false
  }
}

/**
 * Load saved settings and unlocked acts into the store once, then write on every
 * change to `settings` or `unlockedActs`. Never throws. Returns an unsubscribe function.
 */
export function startPersistence(
  store: StoreApi<GameState>,
  storage?: StorageLike | null,
): () => void {
  const resolve = (): StorageLike | null => (storage === undefined ? getStorage() : storage)

  const saved = parseSaved(readRaw(resolve()))
  store.getState().setSettings(saved.settings)
  store.getState().setUnlockedActs(saved.unlockedActs)

  return store.subscribe((state, prev) => {
    if (state.settings === prev.settings && state.unlockedActs === prev.unlockedActs) return
    try {
      writeRaw(serializeSaved({ settings: state.settings, unlockedActs: state.unlockedActs }), resolve())
    } catch (err) {
      warnOnce('write', err)
    }
  })
}

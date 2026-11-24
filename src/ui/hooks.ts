import { useSyncExternalStore } from 'react'
import { fxStore, type FxState } from '../engine/fx'
import { gameStore, type GameState } from '../engine/store'

/** Subscribe to one field of the game store. The selector must return a stable value. */
export function useGame<T>(select: (s: GameState) => T): T {
  return useSyncExternalStore(gameStore.subscribe, () => select(gameStore.getState()))
}

export function useFx<T>(select: (s: FxState) => T): T {
  return useSyncExternalStore(fxStore.subscribe, () => select(fxStore.getState()))
}

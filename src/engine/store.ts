import { createStore } from 'zustand/vanilla'
import type { ActId, MoveMode } from '../types'
import { DEFAULT_SETTINGS, applySettings, type Settings } from './settings'

export type Screen = 'title' | 'menu' | 'chapter' | 'play' | 'archive'

export interface GameState {
  screen: Screen
  act: ActId | null
  checkpoint: string | null
  paused: boolean
  moveMode: MoveMode
  objective: string | null
  target: string | null
  anomaliesSeen: string[]
  settings: Settings
  unlockedActs: ActId[]
  setScreen: (screen: Screen) => void
  setAct: (act: ActId | null) => void
  setCheckpoint: (checkpoint: string | null) => void
  setPaused: (paused: boolean) => void
  setMoveMode: (mode: MoveMode) => void
  setObjective: (objective: string | null) => void
  setTarget: (target: string | null) => void
  addAnomalySeen: (id: string) => void
  setSettings: (partial: Partial<Settings>) => void
  setUnlockedActs: (ids: ActId[]) => void
}

export const gameStore = createStore<GameState>()((set) => ({
  screen: 'title',
  act: null,
  checkpoint: null,
  paused: false,
  moveMode: 'walk',
  objective: null,
  target: null,
  anomaliesSeen: [],
  settings: { ...DEFAULT_SETTINGS },
  unlockedActs: ['act0-pad'],
  setScreen: (screen) => set({ screen }),
  setAct: (act) => set({ act }),
  setCheckpoint: (checkpoint) => set({ checkpoint }),
  setPaused: (paused) => set({ paused }),
  setMoveMode: (moveMode) => set({ moveMode }),
  setObjective: (objective) => set({ objective }),
  setTarget: (target) => set({ target }),
  addAnomalySeen: (id) =>
    set((s) => (s.anomaliesSeen.includes(id) ? s : { anomaliesSeen: [...s.anomaliesSeen, id] })),
  setSettings: (partial) => set((s) => ({ settings: applySettings(s.settings, partial) })),
  setUnlockedActs: (unlockedActs) => set({ unlockedActs: [...unlockedActs] }),
}))

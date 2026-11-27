import { createStore } from 'zustand/vanilla'
import type { Verb } from '../content/verbs'
import type { ActId, MoveMode, Subtitle, TensionState } from '../types'
import { DEFAULT_SETTINGS, applySettings, type Settings } from './settings'

export type Screen = 'gate' | 'begin' | 'game' | 'leaving'

/** The checklist line shown at the top right. `markers` are interactable ids that show a world marker. */
export interface Objective {
  text: string
  keys?: string
  markers?: string[]
}

export interface Target {
  id: string
  verb: Verb
}

export interface GameState {
  screen: Screen
  act: ActId | null
  checkpoint: string | null
  paused: boolean
  /** The browser pointer lock is held. Set by the pointer lock controller. */
  pointerLocked: boolean
  /** The renderer could not start (no WebGL). Menus still work, the game shows a message. */
  renderFailed: boolean
  moveMode: MoveMode
  objective: Objective | null
  target: Target | null
  anomaliesSeen: string[]
  /** Act 3 ending: the answer Buzz gave, kept for the Archive. */
  dreamChoice: 'dream' | 'fine' | null
  /** The two-line choice prompt is on screen. */
  choiceOpen: boolean
  settings: Settings
  fear: number
  heartRate: number
  holdingBreath: boolean
  tension: TensionState
  subtitle: Subtitle | null
  unlockedActs: ActId[]
  /** True once act 5 has been finished. Saved. */
  finished: boolean
  /** A run was started on this browser. Saved, so the article can show marks. */
  played: boolean
  setScreen: (screen: Screen) => void
  setAct: (act: ActId | null) => void
  setCheckpoint: (checkpoint: string | null) => void
  setPaused: (paused: boolean) => void
  setPointerLocked: (locked: boolean) => void
  setRenderFailed: (failed: boolean) => void
  setMoveMode: (mode: MoveMode) => void
  setObjective: (objective: Objective | null) => void
  setTarget: (target: Target | null) => void
  addAnomalySeen: (id: string) => void
  setDreamChoice: (choice: 'dream' | 'fine' | null) => void
  setChoiceOpen: (open: boolean) => void
  setSettings: (partial: Partial<Settings>) => void
  setFear: (fear: number) => void
  setHeartRate: (bpm: number) => void
  setHoldingBreath: (holding: boolean) => void
  setTension: (tension: TensionState) => void
  setSubtitle: (subtitle: Subtitle | null) => void
  setUnlockedActs: (ids: ActId[]) => void
  setFinished: (finished: boolean) => void
  setPlayed: (played: boolean) => void
  resetAnomalies: () => void
}

export const gameStore = createStore<GameState>()((set) => ({
  screen: 'begin',
  act: null,
  checkpoint: null,
  paused: false,
  pointerLocked: false,
  renderFailed: false,
  moveMode: 'walk',
  objective: null,
  target: null,
  anomaliesSeen: [],
  dreamChoice: null,
  choiceOpen: false,
  settings: { ...DEFAULT_SETTINGS },
  fear: 0,
  heartRate: 72,
  holdingBreath: false,
  tension: 'CALM',
  subtitle: null,
  unlockedActs: ['act0-pad'],
  finished: false,
  played: false,
  setScreen: (screen) => set({ screen }),
  setAct: (act) => set({ act }),
  setCheckpoint: (checkpoint) => set({ checkpoint }),
  setPaused: (paused) => set({ paused }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setRenderFailed: (renderFailed) => set({ renderFailed }),
  setMoveMode: (moveMode) => set({ moveMode }),
  setObjective: (objective) => set({ objective }),
  setTarget: (target) => set({ target }),
  addAnomalySeen: (id) =>
    set((s) => (s.anomaliesSeen.includes(id) ? s : { anomaliesSeen: [...s.anomaliesSeen, id] })),
  setDreamChoice: (dreamChoice) => set({ dreamChoice }),
  setChoiceOpen: (choiceOpen) => set({ choiceOpen }),
  setSettings: (partial) => set((s) => ({ settings: applySettings(s.settings, partial) })),
  setFear: (fear) =>
    set((s) => (Number.isFinite(fear) ? { fear: Math.min(1, Math.max(0, fear)) } : s)),
  setHeartRate: (bpm) =>
    set({ heartRate: Number.isFinite(bpm) ? Math.min(180, Math.max(60, bpm)) : 60 }),
  setHoldingBreath: (holdingBreath) => set({ holdingBreath }),
  setTension: (tension) => set({ tension }),
  setSubtitle: (subtitle) => set({ subtitle }),
  setUnlockedActs: (unlockedActs) => set({ unlockedActs: [...unlockedActs] }),
  setFinished: (finished) => set({ finished }),
  setPlayed: (played) => set({ played }),
  resetAnomalies: () => set({ anomaliesSeen: [], dreamChoice: null }),
}))

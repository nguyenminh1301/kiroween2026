// Screen effects an act can drive. Vanilla store, no React or Three.js imports.
import { createStore } from 'zustand/vanilla'

export interface Flash {
  /** Screen position, 0 to 1 from the top left. */
  x: number
  y: number
  /** Diameter as a fraction of the screen height. Default 0.06. */
  size?: number
}

export interface DskyReadout {
  prog: string | number
  verb: string | number
  noun: string | number
  alarm: number | null
}

export interface Hint {
  id: string
  key: string
  text: string
}

export interface FxState {
  blackout: number
  flashes: Flash[]
  caption: string | null
  card: string[] | null
  dsky: DskyReadout | null
  hint: Hint | null
  wrist: boolean
  setBlackout: (v: number) => void
  setFlashes: (f: Flash[]) => void
  setCaption: (s: string | null) => void
  setCard: (lines: string[] | null) => void
  setDsky: (d: DskyReadout | null) => void
  setHint: (h: Hint | null) => void
  setWrist: (on: boolean) => void
  clearFx: () => void
}

const EMPTY = { blackout: 0, flashes: [] as Flash[], caption: null, card: null, dsky: null, hint: null, wrist: false }

export const fxStore = createStore<FxState>()((set) => ({
  ...EMPTY,
  setBlackout: (v) => set({ blackout: Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0 }),
  setFlashes: (flashes) => set({ flashes: [...flashes] }),
  setCaption: (caption) => set({ caption }),
  setCard: (card) => set({ card: card ? [...card] : null }),
  setDsky: (dsky) => set({ dsky }),
  setHint: (hint) => set({ hint }),
  setWrist: (wrist) => set((s) => (s.wrist === wrist ? s : { wrist })),
  clearFx: () => set({ ...EMPTY, flashes: [] }),
}))

export const clearFx = (): void => fxStore.getState().clearFx()

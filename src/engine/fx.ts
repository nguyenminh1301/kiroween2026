// Screen effects an act can drive. Vanilla store, no React or Three.js imports.
import { createStore } from 'zustand/vanilla'

export interface Flash {
  /** Screen position, 0 to 1 from the top left. */
  x: number
  y: number
  /** Diameter as a fraction of the screen height. Default 0.06. */
  size?: number
  /** Draw a dark figure shape on a lit screen instead of a dot. */
  figure?: boolean
}

export interface DskyReadout {
  prog: string | number
  verb: string | number
  noun: string | number
  alarm: number | null
}

/** The close-up pressure gauge of act 2. */
export interface GaugeView {
  /** Pressure reading in psi. */
  needle: number
  /** Needle angle in radians, 0 at twelve o'clock. */
  needleRad: number
  /** Green band start and end, same angle scale. */
  bandRad: [number, number]
  /** Knob position 0 to 1. */
  knob: number
  /** Needle inside the green band. */
  inBand: boolean
  /** Seconds held in the band, 0 to 1. */
  held: number
}

export interface Hint {
  id: string
  key: string
  text: string
}

export interface NoiseMeter {
  /** Status text under the title. */
  label: string
  /** Bar fill, 0 to 1. The white tick sits at `METER_TICK`. */
  fill: number
  /** Past 64% of the hearing threshold. */
  red: boolean
}

/** Where the white tick is on the bar: the point where the creature hears you. */
export const METER_TICK = 0.8

/** The framed print shown for the flag photo. */
export interface PhotoView {
  src: string
  caption: string
  alt: string
}

/** The green AGC readout panel: a header and the lines typed so far. */
export interface ReadoutView {
  header: string
  lines: string[]
}

/** The teeth of the swallow closing over the view. */
export interface Bite {
  /** 0 teeth off screen, 1 closed in the middle. */
  close: number
  /** Red flash strength, 0 to 1. */
  flash: number
}

export interface FxState {
  meter: NoiseMeter | null
  /** Screen edge darkness, 0 to 1. */
  edge: number
  /** Red flash text, or null. */
  flash: string | null
  /** Inside a sleeping bag: fabric all round and a slit about a fifth of the screen high. */
  slit: boolean
  setSlit: (v: boolean) => void
  /** The upper and lower teeth of the swallow, or null. */
  bite: Bite | null
  setBite: (b: Bite | null) => void
  setMeter: (m: NoiseMeter | null) => void
  setEdge: (v: number) => void
  setFlash: (s: string | null) => void
  blackout: number
  /** White camera flash, 0 to 1. */
  whiteout: number
  flashes: Flash[]
  caption: string | null
  card: string[] | null
  dsky: DskyReadout | null
  hint: Hint | null
  wrist: boolean
  gauge: GaugeView | null
  setGauge: (g: GaugeView | null) => void
  setBlackout: (v: number) => void
  setWhiteout: (v: number) => void
  photo: PhotoView | null
  readout: ReadoutView | null
  setReadout: (r: ReadoutView | null) => void
  setPhoto: (p: PhotoView | null) => void
  setFlashes: (f: Flash[]) => void
  setCaption: (s: string | null) => void
  setCard: (lines: string[] | null) => void
  setDsky: (d: DskyReadout | null) => void
  setHint: (h: Hint | null) => void
  setWrist: (on: boolean) => void
  clearFx: () => void
}

const EMPTY = { meter: null as NoiseMeter | null, edge: 0, flash: null as string | null, slit: false, bite: null as Bite | null, blackout: 0, whiteout: 0, flashes: [] as Flash[], caption: null, card: null, dsky: null, hint: null, wrist: false, gauge: null as GaugeView | null, photo: null as PhotoView | null, readout: null as ReadoutView | null }

export const fxStore = createStore<FxState>()((set) => ({
  ...EMPTY,
  setMeter: (meter) => set({ meter }),
  setEdge: (v) => set({ edge: Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0 }),
  setFlash: (flash) => set({ flash }),
  setSlit: (slit) => set({ slit }),
  setBite: (bite) => set({ bite: bite ? { close: Math.min(1, Math.max(0, bite.close)), flash: Math.min(1, Math.max(0, bite.flash)) } : null }),
  setPhoto: (photo) => set({ photo }),
  setReadout: (readout) => set({ readout }),
  setBlackout: (v) => set({ blackout: Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0 }),
  setWhiteout: (v) => set({ whiteout: Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0 }),
  setFlashes: (flashes) => set({ flashes: [...flashes] }),
  setCaption: (caption) => set({ caption }),
  setCard: (card) => set({ card: card ? [...card] : null }),
  setDsky: (dsky) => set({ dsky }),
  setHint: (hint) => set({ hint }),
  setGauge: (gauge) => set({ gauge }),
  setWrist: (wrist) => set((s) => (s.wrist === wrist ? s : { wrist })),
  clearFx: () => set({ ...EMPTY, flashes: [] }),
}))

export const clearFx = (): void => fxStore.getState().clearFx()

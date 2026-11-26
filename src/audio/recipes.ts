// Synthesized stand-ins as plain data. Each layer is an oscillator or filtered noise.
import type { EffectName } from './effects'

export interface Layer {
  /** Start offset in seconds. */
  at: number
  dur: number
  kind: 'osc' | 'noise'
  wave?: OscillatorType
  /** Oscillator frequency in Hz, ignored for noise. */
  f0?: number
  /** End frequency (exponential sweep). */
  f1?: number
  filter?: { type: BiquadFilterType; f: number; f1?: number; q?: number }
  gain: number
  attack?: number
}

export type Recipe = Layer[]

const osc = (at: number, dur: number, f0: number, f1: number | undefined, gain: number, wave: OscillatorType = 'sine', attack?: number): Layer =>
  ({ at, dur, kind: 'osc', wave, f0, f1, gain, attack })
const noise = (at: number, dur: number, type: BiquadFilterType, f: number, gain: number, f1?: number, q?: number, attack?: number): Layer =>
  ({ at, dur, kind: 'noise', filter: { type, f, f1, q }, gain, attack })

const ticks = (n: number, step: number, mk: (t: number, i: number) => Layer): Layer[] =>
  Array.from({ length: n }, (_, i) => mk(i * step, i))

export const RECIPES: Record<EffectName, Recipe> = {
  switch: [noise(0, 0.03, 'highpass', 2000, 0.8), osc(0, 0.05, 900, 400, 0.3, 'square'), osc(0.08, 0.04, 600, 300, 0.2, 'square')],
  breakerPush: [noise(0, 0.12, 'lowpass', 600, 0.8), osc(0, 0.15, 140, 70, 0.8), noise(0.12, 0.03, 'highpass', 2500, 0.5)],
  hatchSlam: [noise(0, 0.6, 'lowpass', 400, 1), osc(0, 0.7, 70, 30, 0.9), noise(0, 0.15, 'bandpass', 1500, 0.6)],
  key: [osc(0, 0.025, 1800, undefined, 0.3, 'square'), noise(0, 0.02, 'highpass', 3000, 0.4)],
  alarm: ticks(8, 0.25, (t, i) => osc(t, 0.2, i % 2 ? 660 : 880, undefined, 0.25, 'square')),
  staging: [noise(0, 0.5, 'lowpass', 800, 1), osc(0, 0.6, 55, 30, 0.8), noise(0, 0.05, 'highpass', 1500, 0.6)],
  launchRoar: [noise(0, 5, 'lowpass', 500, 0.9, undefined, undefined, 0.8), noise(0, 5, 'bandpass', 1200, 0.3, undefined, 0.4, 1.2)],
  rumble: [noise(0, 4, 'lowpass', 150, 1, undefined, undefined, 0.5), osc(0, 4, 40, 36, 0.6, 'sine', 0.5)],
  reentry: [noise(0, 4, 'bandpass', 900, 0.8, undefined, 0.5, 1), noise(0, 4, 'highpass', 3000, 0.15, undefined, undefined, 1.5)],
  chute: [noise(0, 0.8, 'bandpass', 600, 0.9, 1500, 0.8, 0.05), noise(0, 1.2, 'lowpass', 300, 0.5)],
  splash: [noise(0, 1.2, 'lowpass', 2500, 1, 300), noise(0, 0.2, 'highpass', 4000, 0.4)],
  horn: [osc(0, 1.5, 110, undefined, 0.35, 'sawtooth', 0.1), osc(0, 1.5, 165, undefined, 0.25, 'sawtooth', 0.1)],
  locker: [noise(0, 0.08, 'bandpass', 900, 0.8), osc(0, 0.1, 200, 120, 0.4, 'square'), osc(0.15, 0.12, 90, 60, 0.6)],
  zipper: ticks(14, 0.025, (t) => noise(t, 0.015, 'highpass', 3000, 0.5)),
  grab: [noise(0, 0.06, 'lowpass', 1200, 0.8), osc(0, 0.08, 220, 150, 0.4)],
  static: [noise(0, 0.5, 'bandpass', 1800, 0.9, undefined, 0.7)],
  creak: [osc(0, 1.2, 90, 70, 0.3, 'sawtooth', 0.2), noise(0, 1.2, 'bandpass', 300, 0.2, undefined, 3, 0.2)],
  groan: [osc(0, 1.8, 50, 38, 0.5, 'sawtooth', 0.3), noise(0, 1.8, 'lowpass', 200, 0.3, undefined, undefined, 0.3)],
  knock: [0, 0.22, 0.44].flatMap((t) => [osc(t, 0.09, 120, 70, 0.9), noise(t, 0.04, 'lowpass', 500, 0.5)]),
  scrape: [noise(0, 0.8, 'bandpass', 2500, 0.8, 1200, 4, 0.1)],
  click: [0, 0.07, 0.12].map((t) => noise(t, 0.015, 'bandpass', 4000, 0.9, undefined, 6)),
  sting: [osc(0, 1, 600, 1800, 0.4, 'sawtooth', 0.05), osc(0, 1, 640, 1900, 0.3, 'sawtooth', 0.05), noise(0, 1, 'bandpass', 2000, 0.4)],
  breathe: [noise(0, 1.2, 'bandpass', 700, 0.7, undefined, 1, 0.5)],
  cheer: [noise(0, 3, 'bandpass', 1200, 0.8, undefined, 0.4, 0.5)],
  tap: [osc(0, 0.12, 1250, 900, 0.5, 'triangle'), osc(0, 0.2, 420, 380, 0.4), noise(0, 0.03, 'highpass', 3500, 0.5)],
  hiss: [noise(0, 2.2, 'highpass', 4500, 0.5, undefined, undefined, 0.3)],
  gasp: [noise(0, 0.5, 'bandpass', 1400, 0.8, 2600, 1, 0.05), noise(0.55, 0.35, 'lowpass', 900, 0.4)],
  cage: [osc(0, 0.35, 180, 90, 0.6, 'square'), noise(0, 0.5, 'bandpass', 2200, 0.7, 900, 3, 0.05), osc(0.3, 0.6, 70, 50, 0.5)],
}

/** Extra stand-ins that are not named Effects. */
export const HEART_THUMP: Recipe = [osc(0, 0.12, 60, 40, 1), osc(0.18, 0.12, 55, 38, 0.7)]
export const BIRD_CHIRPS: Recipe[] = [
  [osc(0, 0.07, 3200, 4200, 0.25), osc(0.1, 0.07, 3400, 4600, 0.25), osc(0.2, 0.09, 3000, 4800, 0.2)],
  [osc(0, 0.12, 2600, 3800, 0.25), osc(0.16, 0.06, 4200, 3600, 0.2)],
]
export const CHIRP: Recipe = [osc(0, 0.05, 660, undefined, 0.3, 'triangle'), osc(0.06, 0.05, 880, undefined, 0.3, 'triangle')]

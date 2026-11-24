export const QUINDAR = { preHz: 2525, postHz: 2475, seconds: 0.25, rampSeconds: 0.005, gain: 0.12 } as const

/** Tone frequencies for a transmission. A non-finite detune counts as 0. */
export function quindarFreqs(detuneHz: number | undefined): { pre: number; post: number } {
  const d = typeof detuneHz === 'number' && Number.isFinite(detuneHz) ? detuneHz : 0
  return { pre: QUINDAR.preHz + d, post: QUINDAR.postHz + d }
}

import type { Line } from '../content/subtitles'
import type { Speaker } from '../types'

export type DeliveryKind = 'voiced' | 'ground' | 'murmur' | 'los' | 'chirp'

const GROUND: readonly Speaker[] = ['CAPCOM', 'HORNET', 'LAUNCH']

/** How a line is voiced: voiced file, ground radio, murmur from a position, LOS static, or chirp. */
export function deliveryKind(speaker: Speaker, line: Pick<Line, 'voiced'>, hasPosition: boolean): DeliveryKind {
  if (line.voiced === true) return 'voiced'
  if (GROUND.includes(speaker)) return 'ground'
  if (hasPosition) return 'murmur'
  if (speaker === 'LOS') return 'los'
  return 'chirp'
}

export interface Syllable {
  at: number
  dur: number
  /** Band-pass centre in Hz, 500 to 1200. */
  freq: number
}

export const MURMUR_MAX_SECONDS = 2.6

/** Noise syllables in an uneven speaking rhythm. All of them end by `MURMUR_MAX_SECONDS`. */
export function murmurSyllables(rand: () => number, maxSeconds = MURMUR_MAX_SECONDS): Syllable[] {
  const out: Syllable[] = []
  let t = 0
  while (out.length < 40) {
    const dur = 0.07 + rand() * 0.13
    if (t + dur > maxSeconds) break
    out.push({ at: t, dur, freq: 500 + rand() * 700 })
    t += dur + 0.03 + rand() * rand() * 0.3
  }
  return out
}

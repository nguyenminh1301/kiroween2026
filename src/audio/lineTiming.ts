import type { Line } from '../content/subtitles'

export const LINE_GAP = 0.35
export const VOICE_TAIL = 0.3
export const VOICE_MIN_FRACTION = 0.6

/** How long a line shows when read: `seconds` if set, otherwise max(2.4, 1.2 + length / 15). */
export function readingSeconds(line: Pick<Line, 'text' | 'seconds'>): number {
  if (typeof line.seconds === 'number' && Number.isFinite(line.seconds) && line.seconds > 0) return line.seconds
  return Math.max(2.4, 1.2 + line.text.length / 15)
}

/** A voiced line lasts the file plus 0.3 s, never under 60% of reading time. No file: reading time. */
export function voicedSeconds(reading: number, fileSeconds: number | null): number {
  if (fileSeconds === null || !Number.isFinite(fileSeconds)) return reading
  return Math.max(fileSeconds + VOICE_TAIL, reading * VOICE_MIN_FRACTION)
}

/** A ground line lasts the reading time plus two tone lengths. */
export function groundSeconds(reading: number, toneSeconds: number): number {
  return reading + 2 * toneSeconds
}

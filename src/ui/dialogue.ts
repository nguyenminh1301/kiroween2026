// Pure dialogue helpers. No React imports.
import { HUD } from '../content/hud'
import { SPEAKER_NAMES } from '../content/subtitles'
import type { Mood, Speaker } from '../types'

export const TYPE_CPS = 45

/** How many characters are visible after `elapsedSeconds`. */
export function revealCount(elapsedSeconds: number, total: number, cps: number = TYPE_CPS): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0
  return Math.min(total, Math.floor(elapsedSeconds * cps))
}

const RADIO: ReadonlySet<Speaker> = new Set<Speaker>(['CAPCOM', 'UNKNOWN', 'LOS', 'HORNET', 'LAUNCH', 'SWIM'])

/** The name line for a speaker, or null for the narrator. */
export function nameLine(speaker: Speaker, mood: Mood | null): { name: string; tags: string[] } | null {
  const name = SPEAKER_NAMES[speaker]
  if (!name) return null
  const tags: string[] = []
  if (RADIO.has(speaker)) tags.push(HUD.radio)
  if (mood === 'whisper') tags.push(HUD.whisper)
  if (mood === 'distant') tags.push(HUD.distant)
  return { name, tags }
}

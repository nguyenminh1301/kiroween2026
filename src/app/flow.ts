// Pure screen flow rules. No React imports.
import type { ActId } from '../types'
import type { Screen } from '../engine/store'

export const MIN_WIDTH = 900
export const FIRST_ACT: ActId = 'act0-pad'

export interface Env {
  pointerFine: boolean
  width: number
  webgl2: boolean
}

/** Which blocking message to show, if any. */
export function gateReason(env: Env): 'gate' | 'noWebgl' | null {
  if (!env.pointerFine || env.width < MIN_WIDTH) return 'gate'
  if (!env.webgl2) return 'noWebgl'
  return null
}

export function initialScreen(env: Env): Screen {
  return gateReason(env) === 'gate' ? 'gate' : 'begin'
}

/** Start always begins at act 0, first checkpoint. */
export function startAction(): { act: ActId; checkpoint: undefined } {
  return { act: FIRST_ACT, checkpoint: undefined }
}

/** Chapter card length in ms. */
export function cardDurationMs(lines: readonly string[]): number {
  const chars = lines.reduce((n, l) => n + l.length, 0)
  return Math.max(4000, 1500 + 45 * chars)
}

/** A card shows only at the first checkpoint, on a fresh load, when the act has lines. */
export function shouldShowCard(opts: {
  intro: readonly string[] | undefined
  checkpoint: string
  firstCheckpoint: string
  restart: boolean
}): boolean {
  return !opts.restart && !!opts.intro && opts.intro.length > 0 && opts.checkpoint === opts.firstCheckpoint
}

/** Where the article page is, relative to the game page. Works under a sub path. */
export function articleUrl(hash = ''): string {
  return `./${hash ? `#${hash}` : ''}`
}

/** The article section the game ends on. */
export const ARTICLE_END_HASH = 'what-really-happened'

/** Length of the end fade in ms. */
export const END_FADE_MS = 1400

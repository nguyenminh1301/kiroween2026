// The chase gap between the player and the creature. Pure: no Three.js or React imports.

export const GAP_START = 6
export const GAP_MAX = 6
export const PUSH_GAIN = 0.5
export const CLOSE_RATE = 1
export const CLOSE_DELAY = 1

export interface Chase {
  gap: number
  /** Seconds since the last push. */
  sincePush: number
}

export const createChase = (): Chase => ({ gap: GAP_START, sincePush: 0 })

export const pushChase = (c: Chase): Chase => ({ gap: Math.min(GAP_MAX, c.gap + PUSH_GAIN), sincePush: 0 })

export function stepChase(c: Chase, dt: number, lookingBack: boolean): Chase {
  const d = Number.isFinite(dt) ? Math.max(0, dt) : 0
  const sincePush = c.sincePush + d
  const closing = lookingBack || sincePush >= CLOSE_DELAY
  return { gap: closing ? Math.max(0, c.gap - CLOSE_RATE * d) : c.gap, sincePush }
}

export const isCaught = (c: Chase): boolean => c.gap <= 0

/** Seconds between creature sounds at this gap. */
export const soundInterval = (gap: number): number => 0.35 + gap * 0.15

/** Edge darkness, 0.15 far away to 1 when caught. */
export const edgeOpacity = (gap: number): number => 0.15 + 0.85 * (1 - Math.min(GAP_MAX, Math.max(0, gap)) / GAP_MAX)

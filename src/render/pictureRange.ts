import { PICTURES, type Picture } from '../engine/settings'
import { LEVEL_TABLE, lowestLevelAtLeast } from './levelTable'

export { PICTURES, type Picture }

export interface PictureRange {
  /** Level the picture starts at. */
  start: number
  /** Sharpest level the scaler may reach. */
  top: number
  /** Lowest level the scaler may reach. */
  floor: number
}

/** Sharp does not start above this width: 1280x720. */
export const SHARP_START_WIDTH = 1280
const SMALLEST_AUTO_WIDTH = 640

/** Index of the highest level whose width does not exceed `viewPx`; the last level if none does. */
export function levelFitting(viewPx: number): number {
  const px = Number.isFinite(viewPx) ? viewPx : 0
  for (let i = 0; i < LEVEL_TABLE.length; i++) if (LEVEL_TABLE[i][0] <= px) return i
  return LEVEL_TABLE.length - 1
}

/**
 * Levels for a picture setting. `viewPx` is the game view width in real pixels
 * (CSS width times devicePixelRatio).
 * - sharp: starts at the highest level that fits, up to 1280x720. It may climb to what fits,
 *   1920x1080 on a big view, when the frame rate holds. Never below 640x360.
 * - balanced: starts and stays at 960x540 at most, down to 640x360.
 * - retro: starts at 640x360 and may go lower, as before.
 */
export function pictureRange(picture: Picture, viewPx: number): PictureRange {
  const auto = lowestLevelAtLeast(SMALLEST_AUTO_WIDTH)
  const fit = Math.min(auto, levelFitting(viewPx))
  if (picture === 'balanced') {
    const top = lowestLevelAtLeast(960)
    const start = Math.max(top, fit)
    return { start, top, floor: auto }
  }
  if (picture === 'retro') {
    return { start: auto, top: auto, floor: LEVEL_TABLE.length - 1 }
  }
  const startCap = lowestLevelAtLeast(SHARP_START_WIDTH)
  return { start: Math.max(startCap, fit), top: fit, floor: auto }
}

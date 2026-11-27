// Pure sizes for the game window. No DOM.
export const MIN_WINDOW_WIDTH = 900
export const GAME_MIN = { w: 960, h: 540 } as const
export const BAR_HEIGHT = 36
export const FRAME = 1
export const SHARE = 0.95

export interface WindowLayout {
  panelW: number
  panelH: number
  gameW: number
  gameH: number
}

/** Phones and touch-only screens open the page full screen instead of a window. */
export function usesFullPage(width: number, finePointer: boolean): boolean {
  return width < MIN_WINDOW_WIDTH || !finePointer
}

/** The panel takes 95% of the viewport (never under 90%), the game box is the largest 16:9 inside it. */
export function windowLayout(vw: number, vh: number): WindowLayout {
  const chrome = 2 * FRAME
  const panelW = Math.min(vw, Math.max(Math.round(vw * SHARE), GAME_MIN.w + chrome))
  const panelH = Math.min(vh, Math.max(Math.round(vh * SHARE), GAME_MIN.h + BAR_HEIGHT + chrome))
  const areaW = panelW - chrome
  const areaH = panelH - BAR_HEIGHT - chrome
  const gameW = Math.floor(Math.min(areaW, (areaH * 16) / 9))
  const gameH = Math.floor((gameW * 9) / 16)
  return { panelW, panelH, gameW, gameH }
}

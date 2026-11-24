export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const ZERO: Rect = { x: 0, y: 0, width: 0, height: 0 }

export function gameViewSize(windowWidth: number, windowHeight: number): Rect {
  if (
    !Number.isFinite(windowWidth) ||
    !Number.isFinite(windowHeight) ||
    windowWidth <= 0 ||
    windowHeight <= 0
  ) {
    return { ...ZERO }
  }
  let width = windowWidth
  let height = Math.round((width * 9) / 16)
  if (height > windowHeight) {
    height = windowHeight
    width = Math.round((height * 16) / 9)
  }
  return {
    x: Math.round((windowWidth - width) / 2),
    y: Math.round((windowHeight - height) / 2),
    width,
    height,
  }
}

/** Device pixel ratio that makes the drawing buffer equal the internal width. */
export function dprFor(internalWidth: number, rect: Rect): number {
  return rect.width > 0 ? internalWidth / rect.width : 1
}

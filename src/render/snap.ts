export function snapStep(res: number): number {
  return 1 / (res * 0.5)
}

/** Snap one normalized device coordinate to the grid. */
export function snapClip(v: number, res: number): number {
  const h = res * 0.5
  return Math.floor(v * h + 0.5) / h
}

/** Mirror of the vertex shader patch. z and w are never touched. */
export function snapVertex(
  x: number,
  y: number,
  w: number,
  resX: number,
  resY: number,
): { x: number; y: number } {
  if (!(w > 0)) return { x, y }
  return { x: snapClip(x / w, resX) * w, y: snapClip(y / w, resY) * w }
}

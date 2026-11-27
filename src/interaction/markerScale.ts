// Size of a world marker. Pure: no Three.js or React imports.
/** Up to this distance a marker keeps its real size. */
export const MARKER_FULL_SIZE_AT = 4

/** Scale factor for a marker `dist` metres from the eye: past 4 m it grows with distance, so on screen it stays
 *  as big as it is at 4 m and can be seen from anywhere. */
export function markerScale(dist: number): number {
  if (!Number.isFinite(dist) || dist <= MARKER_FULL_SIZE_AT) return 1
  return dist / MARKER_FULL_SIZE_AT
}

// What shows the player where to go in the dream. Pure: no Three.js or React imports.
import { CAGE, CAGE_DOOR_POS } from './layout'

/** Within this many metres of the cage door, its handle glows and the hint names the door. */
export const CAGE_GLOW_RANGE = 3

/** Horizontal distance from a floor point to the cage door. */
export const cageDoorDistance = (x: number, z: number): number => Math.hypot(x - CAGE_DOOR_POS.x, z - CAGE.z)

/** Glow of the cage door handle, 0 to 1: off beyond 3 m and once the door is open, soft at 3 m, stronger up close, with a slow pulse. */
export function cageGlow(dist: number, open: boolean, t: number): number {
  if (open || !(dist <= CAGE_GLOW_RANGE)) return 0
  const near = 1 - Math.max(0, dist) / CAGE_GLOW_RANGE
  return (0.3 + 0.7 * near) * (0.85 + 0.15 * Math.sin(t * 3))
}

/** The marker over the sleeping bags: shown while a crewman is carried, hidden when he is set down. */
export const BAGS_MARKER = 'act3:bags'

/** The objective's markers once the bags marker follows `carrying`, or null when they are right already. */
export function syncCarryMarker(markers: string[] | undefined, carrying: boolean): string[] | null {
  const list = markers ?? []
  const has = list.includes(BAGS_MARKER)
  if (carrying && !has) return [...list, BAGS_MARKER]
  if (!carrying && has) return list.filter((m) => m !== BAGS_MARKER)
  return null
}

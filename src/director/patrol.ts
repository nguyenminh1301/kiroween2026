// The creature's patrol loop and routing between corridor and side room. Pure.

export interface Pt {
  x: number
  z: number
}

export const PATROL_SPEED = 0.8
export const PATROL_POINTS: readonly Pt[] = [
  { x: 0, z: -28.25 },
  { x: 0, z: -16.25 },
  { x: 3, z: -16.25 },
  { x: 3, z: -28.25 },
]

/** Door centre lines, first doorway then second. */
export const DOOR_ZS = [-16.25, -28.25] as const
/** The corridor right wall sits between these x values. Past it is the side room. */
export const ROOM_MIN_X = 1.45

const seg = (i: number): [Pt, Pt] => [PATROL_POINTS[i % 4], PATROL_POINTS[(i + 1) % 4]]
const lens = PATROL_POINTS.map((_, i) => {
  const [a, b] = seg(i)
  return Math.hypot(b.x - a.x, b.z - a.z)
})
export const PATROL_LENGTH = lens.reduce((s, l) => s + l, 0)

/** The point and heading `s` metres along the loop. Wraps around, negative values too. */
export function pointAt(s: number): Pt & { heading: number } {
  let d = ((s % PATROL_LENGTH) + PATROL_LENGTH) % PATROL_LENGTH
  for (let i = 0; i < 4; i++) {
    if (d <= lens[i] || i === 3) {
      const [a, b] = seg(i)
      const u = lens[i] > 0 ? Math.min(1, d / lens[i]) : 0
      const x = a.x + (b.x - a.x) * u
      const z = a.z + (b.z - a.z) * u
      return { x, z, heading: headingTo(a, b) }
    }
    d -= lens[i]
  }
  return { x: PATROL_POINTS[0].x, z: PATROL_POINTS[0].z, heading: 0 }
}

/** Facing angle that looks from `a` toward `b`. Yaw convention: 0 faces -z. */
export const headingTo = (a: Pt, b: Pt): number => Math.atan2(-(b.x - a.x), -(b.z - a.z))

/** Loop distance of the loop point nearest to `p`. */
export function nearestS(p: Pt): number {
  let best = 0
  let bestD = Infinity
  for (let s = 0; s < PATROL_LENGTH; s += 0.25) {
    const q = pointAt(s)
    const d = Math.hypot(q.x - p.x, q.z - p.z)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

export const inRoom = (p: Pt): boolean => p.x > ROOM_MIN_X

/** Waypoints from `from` to `to`, going through the nearest doorway when the regions differ. */
export function route(from: Pt, to: Pt): Pt[] {
  if (inRoom(from) === inRoom(to)) return [to]
  const dz = DOOR_ZS.reduce((best, z) => (Math.abs(from.z - z) + Math.abs(to.z - z) < Math.abs(from.z - best) + Math.abs(to.z - best) ? z : best))
  return inRoom(from)
    ? [{ x: 1.9, z: dz }, { x: 0.9, z: dz }, to]
    : [{ x: 0.9, z: dz }, { x: 1.9, z: dz }, to]
}

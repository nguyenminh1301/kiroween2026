// Neil on the surface: the climb down the ladder, a walking route between work spots and the photo pose.
// Pure: no Three.js or React imports. Figure convention: yaw 0 faces +z, so a heading is atan2(dx, dz).
import { LADDER_FOOT, PAD_TOP, PHOTO_SPOT, PORCH, RUNGS, ladderZ, rungY } from './layout'
import { SITES, groundAt } from './terrain'

export type NeilAnim = 'standing' | 'walk' | 'kneel' | 'scoop' | 'write' | 'camera' | 'ladder'

export interface NeilState {
  x: number
  y: number
  z: number
  /** Heading for the figure: 0 faces +z. */
  yaw: number
  anim: NeilAnim
  /** Seconds of animation, drives the pose. */
  t: number
  /** 0 to 1: how far the camera is lifted in the `camera` pose. */
  amount: number
  visible: boolean
  /** Index into the route being walked, or -1. */
  next: number
  route: NeilStop[]
  loop: boolean
  dwell: number
}

export interface NeilStop {
  x: number
  z: number
  /** What he does on arrival. */
  act: NeilAnim
  /** Seconds he stays. Infinite stops at the end of a route that does not loop. */
  dwell: number
  /** He turns to look at this point while he works. */
  face?: { x: number; z: number }
}

export const NEIL_SPEED = 2.4
export const NEIL_DOWN_SECONDS = 5.2
/** At the foot of the ladder, where he waits for Buzz. */
export const NEIL_FOOT = { x: -1.3, z: 5.2 } as const
/** A few metres in front of the photo spot, facing it. */
export const NEIL_PHOTO = { x: 0.1, z: 13.4 } as const

export const headingTo = (fx: number, fz: number, tx: number, tz: number): number => Math.atan2(tx - fx, tz - fz)

const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Where he works, near the lander and clear of its legs. A ping-pong route, so no leg crosses the stage. */
export const WORK_STOPS: NeilStop[] = [
  { x: 3.5, z: 6.0, act: 'scoop', dwell: 7 },
  { x: 6.8, z: 2.0, act: 'kneel', dwell: 6 },
  { x: 3.5, z: 6.0, act: 'standing', dwell: 0.5 },
  { x: -4.5, z: 5.5, act: 'write', dwell: 5 },
  { x: -6.5, z: 2.0, act: 'camera', dwell: 5, face: { x: -9, z: -1 } },
  { x: -4.5, z: 5.5, act: 'standing', dwell: 0.5 },
]

export function createNeil(): NeilState {
  return { x: NEIL_FOOT.x, y: 0, z: NEIL_FOOT.z, yaw: Math.PI, anim: 'standing', t: 0, amount: 0, visible: false, next: -1, route: [], loop: false, dwell: 0 }
}

/** Neil on the ladder `t` seconds in: steps onto the top rung, climbs down nine rungs, drops to the pad, steps off. */
export function neilClimbAt(t: number): Pick<NeilState, 'x' | 'y' | 'z' | 'yaw' | 'anim' | 't'> {
  const face = Math.PI
  const onRung = (y: number): { x: number; y: number; z: number } => ({ x: 0, y, z: ladderZ(Math.max(y, rungY(0))) + 0.5 })
  const T0 = 0.8
  const T1 = 3.6
  const T2 = 4.1
  if (t < T0) {
    const u = clamp01(t / T0)
    return { x: 0, y: PORCH.y, z: lerp(PORCH.z, onRung(rungY(RUNGS - 1)).z, u), yaw: face, anim: 'standing', t }
  }
  if (t < T1) {
    // Step by step: the height falls in nine small steps with a quick ease inside each.
    const u = (t - T0) / (T1 - T0)
    const k = u * RUNGS
    const i = Math.floor(k)
    const f = k - i
    const eased = f * f * (3 - 2 * f)
    const y = rungY(RUNGS - 1) - (i + eased) * ((rungY(RUNGS - 1) - rungY(0)) / RUNGS) - 0.2
    return { ...onRung(Math.max(rungY(0), y)), yaw: face, anim: 'ladder', t }
  }
  if (t < T2) {
    const u = clamp01((t - T1) / (T2 - T1))
    const start = onRung(rungY(0))
    return { x: 0, y: lerp(start.y, PAD_TOP, u * u), z: lerp(start.z, LADDER_FOOT.z, u), yaw: face, anim: 'standing', t }
  }
  const u = clamp01((t - T2) / (NEIL_DOWN_SECONDS - T2))
  const x = lerp(0, NEIL_FOOT.x, u)
  const z = lerp(LADDER_FOOT.z, NEIL_FOOT.z, u)
  return { x, y: lerp(PAD_TOP, groundAt(x, z), clamp01(u * 2)), z, yaw: u < 0.4 ? face : headingTo(0, LADDER_FOOT.z, NEIL_FOOT.x, NEIL_FOOT.z), anim: u < 0.98 ? 'walk' : 'standing', t }
}

/** Send him along a route. With `loop`, the route repeats. */
export function sendNeil(n: NeilState, route: NeilStop[], loop = false): void {
  n.route = route
  n.next = route.length ? 0 : -1
  n.loop = loop
  n.dwell = 0
  if (route.length) n.anim = 'walk'
}

/** Puts him on the spot at once, in the given pose. */
export function placeNeil(n: NeilState, x: number, z: number, anim: NeilAnim, face?: { x: number; z: number }): void {
  n.x = x
  n.z = z
  n.y = groundAt(x, z)
  n.anim = anim
  n.route = []
  n.next = -1
  if (face) n.yaw = headingTo(x, z, face.x, face.z)
}

/** One step of the walk, the dwell at each stop and the loop. `dt` is clamped by the caller. */
export function stepNeil(n: NeilState, dt: number): void {
  n.t += dt
  if (n.next < 0) {
    n.y = groundAt(n.x, n.z)
    return
  }
  const stop = n.route[n.next]
  const dx = stop.x - n.x
  const dz = stop.z - n.z
  const d = Math.hypot(dx, dz)
  if (n.dwell <= 0 && d > 0.05) {
    const step = Math.min(d, NEIL_SPEED * dt)
    n.x += (dx / d) * step
    n.z += (dz / d) * step
    n.yaw = Math.atan2(dx, dz)
    n.anim = 'walk'
    n.y = groundAt(n.x, n.z)
    return
  }
  // Arrived: work, then move on.
  if (n.dwell <= 0) {
    n.dwell = Number.isFinite(stop.dwell) ? stop.dwell : Infinity
    n.anim = stop.act
    n.t = 0
    if (stop.face) n.yaw = headingTo(n.x, n.z, stop.face.x, stop.face.z)
  }
  if (stop.act === 'camera') n.amount = clamp01(n.amount + dt / 1.2)
  n.dwell -= dt
  if (n.dwell <= 0) {
    n.amount = 0
    const last = n.next + 1 >= n.route.length
    if (last && !n.loop) {
      n.next = -1
      n.anim = stop.act === 'camera' ? 'standing' : stop.act
      return
    }
    n.next = last ? 0 : n.next + 1
    n.dwell = 0
    n.anim = 'walk'
    n.yaw = headingTo(n.x, n.z, n.route[n.next].x, n.route[n.next].z)
  }
}

/** The photo: stands at the spot facing Buzz, the camera comes up over `PHOTO_LIFT` seconds. */
export const PHOTO_LIFT = 1.2
export const photoStop = (): NeilStop => ({ x: NEIL_PHOTO.x, z: NEIL_PHOTO.z, act: 'camera', dwell: Infinity, face: { x: (PHOTO_SPOT.x + SITES.flag.x) / 2, z: (PHOTO_SPOT.z + SITES.flag.z) / 2 } })

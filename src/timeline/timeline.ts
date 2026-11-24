import type { Vec3 } from '../types'

export interface TimelineEvent {
  at: number
  run: () => void
}

export interface CameraKey {
  t: number
  position: Vec3
  lookAt: Vec3
}

export interface CameraPose {
  position: Vec3
  lookAt: Vec3
}

export interface Shot {
  from: number
  to: number
  cam: (u: number, t: number) => CameraPose
  fov?: number
  far?: number
}

export interface ShakeKey {
  t: number
  amp: number
}

export interface TimelineDef {
  duration: number
  events?: TimelineEvent[]
  camera?: CameraKey[]
  shots?: Shot[]
  shake?: ShakeKey[]
  onTick?: (t: number) => void
}

export interface ShotSelection {
  shot: Shot
  u: number
  pose: CameraPose
  fov?: number
  far?: number
}

export const REDUCED_MOTION_SHAKE_SCALE = 0.25

/** Events sorted by (at, original index). Array.prototype.sort is stable, the index is explicit anyway. */
export function sortedEvents(def: TimelineDef): TimelineEvent[] {
  return (def.events ?? [])
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.at - b.event.at || a.index - b.index)
    .map((entry) => entry.event)
}

/**
 * Events not yet fired whose `at` is at or before `toT`, in (at, index) order.
 * `firedCount` is how many of the sorted events have already run, so each event
 * is returned once no matter how time is split into steps. `fromT` is the time
 * before the step and is not needed for the decision.
 */
export function dueEvents(def: TimelineDef, firedCount: number, _fromT: number, toT: number): TimelineEvent[] {
  const sorted = sortedEvents(def)
  const out: TimelineEvent[] = []
  for (let i = Math.max(0, firedCount); i < sorted.length; i++) {
    if (sorted[i].at > toT) break
    out.push(sorted[i])
  }
  return out
}

/** Every event not yet fired, in order. Used by skip(). */
export function remainingEvents(def: TimelineDef, firedCount: number): TimelineEvent[] {
  return sortedEvents(def).slice(Math.max(0, firedCount))
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f
}

function lerpVec(a: Vec3, b: Vec3, f: number): Vec3 {
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f) }
}

function sortedByT<T extends { t: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.t - b.item.t || a.index - b.index)
    .map((entry) => entry.item)
}

/** Linear interpolation between neighbouring keys, holding the first and last key outside the range. */
export function interpolateCamera(keys: CameraKey[] | undefined, t: number): CameraPose | null {
  if (!keys || keys.length === 0) return null
  const k = sortedByT(keys)
  const first = k[0]
  const last = k[k.length - 1]
  if (t <= first.t) return { position: { ...first.position }, lookAt: { ...first.lookAt } }
  if (t >= last.t) return { position: { ...last.position }, lookAt: { ...last.lookAt } }
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]
    const b = k[i + 1]
    if (t >= a.t && t < b.t) {
      const f = (t - a.t) / (b.t - a.t)
      return { position: lerpVec(a.position, b.position, f), lookAt: lerpVec(a.lookAt, b.lookAt, f) }
    }
  }
  return { position: { ...last.position }, lookAt: { ...last.lookAt } }
}

/**
 * The shot owning time `t`: ignores shots with `to <= from`, uses [from, to),
 * so a shared boundary belongs to the next shot. Overlaps resolve to the last listed.
 */
export function selectShot(shots: Shot[] | undefined, t: number): Shot | null {
  if (!shots) return null
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]
    if (s.to <= s.from) continue
    if (t >= s.from && t < s.to) return s
  }
  return null
}

/** Shot selection plus its camera result, `u` in [0, 1), and fov/far when the shot sets them. */
export function evaluateShot(shots: Shot[] | undefined, t: number): ShotSelection | null {
  const shot = selectShot(shots, t)
  if (!shot) return null
  const u = (t - shot.from) / (shot.to - shot.from)
  const sel: ShotSelection = { shot, u, pose: shot.cam(u, t) }
  if (shot.fov !== undefined) sel.fov = shot.fov
  if (shot.far !== undefined) sel.far = shot.far
  return sel
}

/** Shake amplitude in metres, linear between keys, held outside the range, x0.25 with reduced motion. */
export function shakeAmplitude(keys: ShakeKey[] | undefined, t: number, reducedMotion: boolean): number {
  if (!keys || keys.length === 0) return 0
  const k = sortedByT(keys)
  let amp: number
  if (t <= k[0].t) amp = k[0].amp
  else if (t >= k[k.length - 1].t) amp = k[k.length - 1].amp
  else {
    amp = k[k.length - 1].amp
    for (let i = 0; i < k.length - 1; i++) {
      if (t >= k[i].t && t < k[i + 1].t) {
        amp = lerp(k[i].amp, k[i + 1].amp, (t - k[i].t) / (k[i + 1].t - k[i].t))
        break
      }
    }
  }
  return reducedMotion ? amp * REDUCED_MOTION_SHAKE_SCALE : amp
}

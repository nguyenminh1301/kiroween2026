// Liftoff timeline data: the ascent stage leaves the descent stage, fire, blast scraps, the AGC readout, shots and events.
// Pure: events call injected hooks. No Three.js or React imports.
import type { ShakeKey, Shot, TimelineEvent } from '../../timeline/timeline'
import type { Vec3 } from '../../types'
import { cabinEye } from './descent'
import { ROOF, faceAt } from './layout'
import { groundAt } from './terrain'

export const LIFTOFF_DURATION = 14
export const FIRE_AT = 1.4
export const FIRE_FADE = 7
/** The readout panel is up for this long after ignition. */
export const READOUT_SECONDS = 4
export const READOUT_CPS = 38
export const BLAST_SCRAPS = 70
export const BLAST_DUST = 130
export const FLAG_TIP_DELAY = 0.4
/** The next act is fetched this far into the shot, so the switch has nothing left to load. */
export const PRELOAD_AT = 9
/** The picture fades to black from here and is black at the end of the shot. */
export const FADE_FROM = 12.6

/** How far the ascent stage has climbed `t` seconds in. */
export const ascentRise = (t: number): number => (t <= FIRE_AT ? 0 : (t - FIRE_AT) ** 1.8 * 0.9)

/** Height of the ascent stage, base to top, metres. */
export const ASCENT_LENGTH = 2.1
/** The flame is a long narrow cone that fades over three stage lengths. */
export const FIRE_LENGTH = ASCENT_LENGTH * 3
export const FIRE_RADIUS_TOP = 0.3
export const FIRE_RADIUS_TAIL = 0.55

/** Flame length and width scale for a fire level 0 to 1. */
export function fireShape(level: number): { length: number; width: number } {
  const l = Math.min(1, Math.max(0, level))
  return { length: FIRE_LENGTH * (0.45 + 0.55 * l), width: 0.6 + 0.4 * l }
}

/** 0 before ignition, 1 at ignition, 0 again after 7 s. */
export const fireLevel = (t: number): number => (t < FIRE_AT ? 0 : Math.max(0, 1 - (t - FIRE_AT) / FIRE_FADE))

export const readoutOn = (t: number): boolean => t >= FIRE_AT && t < FIRE_AT + READOUT_SECONDS

export interface Readout {
  header: string
  /** Lines typed so far; the last one may be partial. */
  lines: string[]
}

/** The AGC readout `t` seconds into the liftoff: lines typed one after another. Null before ignition and after 4 s. */
export function readoutAt(t: number, header: string, lines: readonly string[]): Readout | null {
  if (!readoutOn(t)) return null
  const tau = t - FIRE_AT
  const out: string[] = []
  let start = 0.25
  for (const line of lines) {
    const n = Math.floor((tau - start) * READOUT_CPS)
    if (n <= 0) break
    out.push(line.slice(0, Math.min(line.length, n)))
    start += line.length / READOUT_CPS + 0.18
  }
  return { header, lines: out }
}

const hash = (i: number, k: number): number => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const MOON_G = 1.62

/** A gold foil scrap thrown off the descent stage deck by the blast, `tau` seconds after ignition. Lands and stays. */
export function scrapAt(i: number, tau: number): Vec3 {
  const a = i * 2.399963
  const r0 = 0.5 + hash(i, 1) * 1.2
  const speed = 2.5 + hash(i, 2) * 7
  const vy = 1.5 + hash(i, 3) * 5
  const y0 = 3.04
  const land = (vy + Math.sqrt(vy * vy + 2 * MOON_G * (y0 - 0.03))) / MOON_G
  const t = Math.max(0, Math.min(tau, land))
  const flutter = tau < land ? 0.04 * Math.sin(tau * 14 + i) : 0
  return {
    x: Math.cos(a) * (r0 + speed * t) + flutter,
    y: Math.max(0.03, y0 + vy * t - 0.5 * MOON_G * t * t),
    z: Math.sin(a) * (r0 + speed * t) + flutter,
  }
}

/** A grain of dust blown out along the ground from under the stage. */
export function blastDustAt(i: number, tau: number): Vec3 {
  const a = i * 2.399963 + hash(i, 5)
  const speed = 4 + hash(i, 6) * 10
  const vy = 0.8 + hash(i, 7) * 2.6
  const t = Math.max(0, tau)
  const r = 1.8 + speed * t * (1 - 0.06 * t)
  return { x: Math.cos(a) * r, y: Math.max(0.05, 0.1 + vy * t - 0.5 * MOON_G * t * t * 0.6), z: Math.sin(a) * r }
}

/** Black level, 0 to 1: 0 until `FADE_FROM`, then a straight ramp to 1 at the end. */
export const fadeAt = (t: number): number => Math.min(1, Math.max(0, (t - FADE_FROM) / (LIFTOFF_DURATION - FADE_FROM)))

/** Flag tip, 0 upright to 1 fallen. */
export const flagTip = (t: number): number => Math.min(1, Math.max(0, (t - FIRE_AT - FLAG_TIP_DELAY) / 0.8))

export const LIFTOFF_SHAKE: ShakeKey[] = [
  { t: 0, amp: 0 },
  { t: 1.4, amp: 0 },
  { t: 1.6, amp: 0.12 },
  { t: 5, amp: 0.05 },
  { t: 9, amp: 0 },
]

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const lerp = (a: number, b: number, f: number): number => a + (b - a) * f

export interface LiftShot extends Shot {
  name: string
}

export const LIFTOFF_SHOTS: LiftShot[] = [
  {
    name: 'cabin-panel',
    from: 0,
    to: 1.4,
    fov: 70,
    far: 3000,
    cam: () => ({ position: cabinEye(0), lookAt: faceAt(2, 0.5, 0.55) }),
  },
  {
    name: 'wide',
    from: 1.4,
    to: 2.4,
    fov: 60,
    far: 3000,
    cam: () => ({ position: v(13, groundAt(13, 16) + 3.5, 16), lookAt: v(0, 2.6, 0) }),
  },
  {
    name: 'engine',
    from: 2.4,
    to: 5,
    fov: 80,
    far: 3000,
    cam: (_u, t) => ({ position: v(4.6, 2.0, 5.4), lookAt: v(ROOF.x * 0.2, 3.1 + ascentRise(t) * 0.5, ROOF.z * 0.2) }),
  },
  {
    name: 'cabin-window',
    from: 5,
    to: 7.5,
    fov: 75,
    far: 3000,
    cam: (_u, t) => ({ position: cabinEye(ascentRise(t)), lookAt: faceAt(0, 0.5, 0.4, 0.5) }),
  },
  {
    name: 'ground',
    from: 7.5,
    to: 9,
    fov: 65,
    far: 3000,
    cam: (_u, t) => ({ position: v(8, groundAt(8, 11) + 1.2, 11), lookAt: v(0, 3 + ascentRise(t), 0) }),
  },
  {
    name: 'pullback',
    from: 9,
    to: 14,
    fov: 55,
    far: 3000,
    cam: (u, t) => ({
      position: v(lerp(10, 40, u), lerp(3, 14 + ascentRise(t) * 0.3, u), lerp(12, 55, u)),
      lookAt: v(0, 3 + ascentRise(t), 0),
    }),
  },
]

export interface LiftoffHooks {
  say(id: string, opts?: { urgent?: boolean }): void
  readout(on: boolean): void
  anomaly(id: string): void
  preload(): void
  end(): void
}

/** The liftoff events, in timeline order. */
export function liftoffEvents(h: LiftoffHooks): TimelineEvent[] {
  return [
    { at: 0.3, run: () => h.say('act4.liftoff', { urgent: true }) },
    {
      at: FIRE_AT,
      run: () => {
        h.readout(true)
        h.anomaly('burn-routine')
      },
    },
    { at: FIRE_AT + READOUT_SECONDS, run: () => h.readout(false) },
    {
      at: FIRE_AT + FLAG_TIP_DELAY + 0.6,
      run: () => {
        h.say('act4.flagdown')
        h.anomaly('flag-knocked')
      },
    },
    { at: PRELOAD_AT, run: () => h.preload() },
    { at: 10.5, run: () => h.say('act4.columbia') },
    { at: LIFTOFF_DURATION, run: () => h.end() },
  ]
}

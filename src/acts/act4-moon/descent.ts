// Descent timeline data: lander height, shots, shake and the DSKY and radio events.
// Pure: events call injected hooks. No Three.js or React imports.
import type { DskyReadout } from '../../engine/fx'
import type { ShakeKey, Shot, TimelineEvent } from '../../timeline/timeline'
import type { Vec3 } from '../../types'
import { groundAt } from './terrain'

export const DESCENT_DURATION = 24
export const TOUCHDOWN_AT = 22
export const START_HEIGHT = 40
export const PLUME_MIN = 0.02
export const DUST_BELOW = 10

/** Lander height above the ground `t` seconds into the descent. */
export const landerHeight = (t: number): number => START_HEIGHT * Math.max(0, 1 - t / TOUCHDOWN_AT) ** 1.6

export const plumeOn = (h: number): boolean => h > PLUME_MIN

/** Dust sheet strength, 0 above 10 m and growing to 1 on the ground. */
export const dustLevel = (h: number): number => (h >= DUST_BELOW ? 0 : 1 - Math.max(0, h) / DUST_BELOW)

/** Seconds the sheet takes to die out after touchdown. */
export const DUST_FADE = 1

/** Dust sheet strength at descent time `t`: grows below 10 m, dies out just after touchdown. */
export function dustAt(t: number): number {
  const fade = t <= TOUCHDOWN_AT ? 1 : Math.max(0, 1 - (t - TOUCHDOWN_AT) / DUST_FADE)
  return dustLevel(landerHeight(t)) * fade
}

export interface DustShape {
  /** Outer radius of the sheet in metres. */
  radius: number
  /** Wall height at the leading edge, metres. */
  height: number
  /** Opacity of the ring, 0 to 1. */
  opacity: number
}

/** Size of the sheet for a dust level: wide, thin, and clearly visible once it is out. */
export function dustShape(level: number): DustShape {
  return { radius: level <= 0 ? 0 : 4 + level * 20, height: 0.15 + level * 0.6, opacity: level <= 0 ? 0 : Math.min(0.7, 0.2 + level * 0.5) }
}

/** The descent shots get a fill light and a rim so the foil reads against the stars. */
export const descentFill = (t: number): number => (t >= 0 && t < DESCENT_DURATION ? 1 : 0)

export const DESCENT_SHAKE: ShakeKey[] = [
  { t: 0, amp: 0.02 },
  { t: 22, amp: 0.02 },
  { t: 22.5, amp: 0 },
]

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const lerp = (a: number, b: number, f: number): number => a + (b - a) * f

export interface DescentShot extends Shot {
  name: string
}

/** Four outside shots. The camera never goes below the ground. */
export const DESCENT_SHOTS: DescentShot[] = [
  {
    name: 'high',
    from: 0,
    to: 7,
    fov: 60,
    far: 2000,
    cam: (_u, t) => ({ position: v(16, landerHeight(t) + 7, 18), lookAt: v(0, landerHeight(t), 0) }),
  },
  {
    name: 'below',
    from: 7,
    to: 13,
    fov: 80,
    far: 2000,
    cam: (u, t) => ({
      position: v(lerp(5, 3.5, u), groundAt(5, 6) + 1.2, lerp(6, 4.5, u)),
      lookAt: v(0, landerHeight(t) + 0.5, 0),
    }),
  },
  {
    name: 'far',
    from: 13,
    to: 19,
    fov: 50,
    far: 2000,
    cam: (_u, t) => ({ position: v(-34, groundAt(-34, 30) + 1.8, 30), lookAt: v(0, landerHeight(t) + 1.5, 0) }),
  },
  {
    name: 'close',
    from: 19,
    to: 24,
    fov: 60,
    far: 2000,
    cam: (u, t) => ({
      position: v(lerp(9, 7, u), groundAt(8, 8) + 1.1, lerp(10, 8, u)),
      lookAt: v(0, landerHeight(t) + 1.6, 0),
    }),
  },
]

export interface DescentHooks {
  say(id: string): void
  dsky(r: DskyReadout): void
  beep(): void
}

const r = (prog: number, verb: number, noun: number, alarm: number | null): DskyReadout => ({ prog, verb, noun, alarm })

/** The DSKY and radio events, in timeline order. */
export function descentEvents(h: DescentHooks): TimelineEvent[] {
  return [
    { at: 0, run: () => h.dsky(r(63, 16, 68, null)) },
    { at: 0.5, run: () => h.say('act4.go') },
    {
      at: 4,
      run: () => {
        h.dsky(r(63, 16, 68, 1202))
        h.beep()
        h.say('act4.alarm')
      },
    },
    {
      at: 8,
      run: () => {
        h.dsky(r(64, 6, 63, null))
        h.say('act4.goalarm')
      },
    },
    {
      at: 11,
      run: () => {
        h.dsky(r(64, 6, 63, 1201))
        h.beep()
      },
    },
    {
      at: 13,
      run: () => {
        h.dsky(r(64, 6, 63, null))
        h.say('act4.sixty')
      },
    },
    { at: 17, run: () => h.say('act4.thirty') },
    { at: 21.5, run: () => h.say('act4.contact') },
  ]
}

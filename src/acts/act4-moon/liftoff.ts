// Liftoff timeline data: ascent stage rise, fire, flag tip, shots and events.
// Pure: events call injected hooks. No Three.js or React imports.
import type { ShakeKey, Shot, TimelineEvent } from '../../timeline/timeline'
import type { Vec3 } from '../../types'
import { ROOF } from './layout'
import { groundAt } from './terrain'

export const LIFTOFF_DURATION = 14
export const FIRE_AT = 1.4
export const FIRE_FADE = 7
export const CAPTION_SECONDS = 4
export const FLAG_TIP_DELAY = 0.4

/** How far the ascent stage has climbed `t` seconds in. */
export const ascentRise = (t: number): number => (t <= FIRE_AT ? 0 : (t - FIRE_AT) ** 1.8 * 0.9)

/** 0 before ignition, 1 at ignition, 0 again after 7 s. */
export const fireLevel = (t: number): number => (t < FIRE_AT ? 0 : Math.max(0, 1 - (t - FIRE_AT) / FIRE_FADE))

export const captionOn = (t: number): boolean => t >= FIRE_AT && t < FIRE_AT + CAPTION_SECONDS

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
    name: 'wide',
    from: 0,
    to: 1.5,
    fov: 60,
    far: 3000,
    cam: () => ({ position: v(13, groundAt(13, 16) + 3.5, 16), lookAt: v(0, 2.6, 0) }),
  },
  {
    name: 'engine',
    from: 1.5,
    to: 5,
    fov: 80,
    far: 3000,
    cam: (_u, t) => ({ position: v(2.9, 4.4 + ascentRise(t) * 0.5, 2.9), lookAt: v(ROOF.x, ROOF.y - 0.2, ROOF.z) }),
  },
  {
    name: 'ground',
    from: 5,
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
  caption(text: string | null): void
  anomaly(id: string): void
  end(): void
}

/** The liftoff events, in timeline order. */
export function liftoffEvents(h: LiftoffHooks, captionText: string): TimelineEvent[] {
  return [
    { at: 0.3, run: () => h.say('act4.liftoff', { urgent: true }) },
    {
      at: FIRE_AT,
      run: () => {
        h.caption(captionText)
        h.anomaly('burn-baby-burn')
      },
    },
    { at: FIRE_AT + CAPTION_SECONDS, run: () => h.caption(null) },
    { at: FIRE_AT + FLAG_TIP_DELAY + 0.6, run: () => h.say('act4.flagdown') },
    { at: 10.5, run: () => h.say('act4.columbia') },
    { at: LIFTOFF_DURATION, run: () => h.end() },
  ]
}

// Act 5 timeline data: shots, shake, formulas and events. Pure: events call injected hooks,
// so a test can record them. No Three.js or React imports.
import type { ShakeKey, Shot, TimelineEvent } from '../../timeline/timeline'
import type { Vec3 } from '../../types'
import { heliProgress, HORNET_OFFSET } from './heli'

export type View = 'cabin' | 'entry' | 'ocean'

export interface NamedShot extends Shot {
  name: string
  view: Exclude<View, 'cabin'>
}

export const ENTRY_X = -5000
export const OCEAN_X = 5000
export const DURATION = 72
export const START_HEIGHT = 900
export const SPLASH_AT = 45
export const SPLASH_LEN = 7
export const COLLAR_AT = 56
export const FADE_AT = 69.5
export const FADE_LEN = 2
export const COMPLETE_AT = 71.5
export const DESTROYER = { x: -38, z0: 330, speed: 6, from: 31 } as const
export { HORNET_OFFSET }

const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/** Plasma heat, 0 to 1. */
export function heat(t: number): number {
  if (t < 4) return 0
  if (t < 10) return (t - 4) / 6
  if (t < 18) return 1
  if (t < 21) return 1 - (t - 18) / 3
  return 0
}

/** Capsule height over the sea in metres. */
export function height(t: number): number {
  if (t <= 31) return START_HEIGHT
  return START_HEIGHT * Math.max(0, 1 - (t - 31) / 14) ** 1.3
}

export const drogueOn = (t: number): boolean => t >= 21 && t < 29
/** Main chutes opening, 0 to 1 from 28 s over 3 s. */
export const mainsOpen = (t: number): number => clamp01((t - 28) / 3)
/** Splash progress, 0 to 1 from 45 s over 7 s. */
export const splashProgress = (t: number): number => clamp01((t - SPLASH_AT) / SPLASH_LEN)
export const collarProgress = (t: number): number => clamp01((t - COLLAR_AT) / 2)
export const fadeLevel = (t: number): number => clamp01((t - FADE_AT) / FADE_LEN)
export const destroyerZ = (t: number): number => DESTROYER.z0 - DESTROYER.speed * Math.max(0, t - DESTROYER.from)

/** Capsule position in the ocean set: height, then a small bob once it floats. */
export function capsuleY(t: number, wave = 0): number {
  return t < SPLASH_AT ? height(t) : 0.5 + wave
}

export const ENTRY_SHOTS_END = 26

const RAW_SHOTS: NamedShot[] = [
  {
    name: 'entryClose',
    view: 'entry',
    from: 5,
    to: 12,
    fov: 60,
    far: 9000,
    cam: (u) => ({ position: v(lerp(-7, -6, u), lerp(1.2, 2.2, u), lerp(9, 7.5, u)), lookAt: v(0.4, 0, 0) }),
  },
  {
    name: 'entryFade',
    view: 'entry',
    from: 20,
    to: 26,
    fov: 60,
    far: 9000,
    cam: (u) => ({ position: v(lerp(8, 10, u), lerp(3, 4, u), lerp(11, 14, u)), lookAt: v(0, 0.5, 0) }),
  },
  {
    name: 'mains',
    view: 'ocean',
    from: 31,
    to: 37,
    fov: 62,
    far: 6000,
    cam: (_u, t) => {
      const y = height(t)
      // Well below and off to the side, so the capsule base stays small and all three canopies show.
      return { position: v(2, y - 14, 30), lookAt: v(0, y + 24, 0) }
    },
  },
  {
    name: 'drop',
    view: 'ocean',
    from: 37,
    to: 44,
    fov: 60,
    far: 6000,
    cam: (u, t) => {
      const y = height(t)
      return { position: v(lerp(34, 26, u), y + lerp(8, 5, u), lerp(46, 36, u)), lookAt: v(0, y + 6, 0) }
    },
  },
  {
    name: 'splash',
    view: 'ocean',
    from: 44,
    to: 50,
    fov: 62,
    far: 6000,
    cam: (u) => ({ position: v(lerp(16, 12, u), lerp(1.4, 2.2, u), lerp(24, 20, u)), lookAt: v(0, 3, 0) }),
  },
  {
    name: 'ships',
    view: 'ocean',
    from: 50,
    to: 57,
    fov: 58,
    far: 6000,
    cam: (u, t) => ({
      position: v(lerp(7, 5, u), 1.5, lerp(-11, -13, u)),
      lookAt: v(DESTROYER.x * 0.5, 7, destroyerZ(t) * 0.6),
    }),
  },
  {
    name: 'pull',
    view: 'ocean',
    from: 57,
    to: 72,
    fov: 58,
    far: 6000,
    // Close on the Sea King over the capsule, with the carrier far behind it.
    cam: (u) => ({
      position: v(lerp(-17, -13, u), lerp(8, 10, u), lerp(24, 19, u)),
      lookAt: v(lerp(7, 9, u), lerp(11, 11.5, u), lerp(5, 4, u)),
    }),
  },
]

/** Shot positions above are relative to their set; this moves them to the set's place in the world. */
export const SHOTS: NamedShot[] = RAW_SHOTS.map((shot) => {
  const dx = shot.view === 'entry' ? ENTRY_X : OCEAN_X
  return {
    ...shot,
    cam: (u, t) => {
      const c = shot.cam(u, t)
      return { position: { ...c.position, x: c.position.x + dx }, lookAt: { ...c.lookAt, x: c.lookAt.x + dx } }
    },
  }
})

export const SHAKE: ShakeKey[] = [
  { t: 0, amp: 0 },
  { t: 4, amp: 0.01 },
  { t: 12, amp: 0.05 },
  { t: 16, amp: 0.09 },
  { t: 20, amp: 0.03 },
  { t: 21, amp: 0.08 },
  { t: 22, amp: 0.01 },
  { t: 26, amp: 0 },
]

export function shotAt(t: number): NamedShot | null {
  return SHOTS.find((s) => t >= s.from && t < s.to) ?? null
}
export const viewAt = (t: number): View => shotAt(t)?.view ?? 'cabin'

/** Ocean ambience level: none before 31 s, full while a shot is outside, 0.35 in the cabin. */
export function oceanLevel(t: number, outside: boolean): number {
  if (t < 31) return 0
  return outside ? 1 : 0.35
}

/** Helicopter ambience level: rises with the approach, 0.3 of it in the cabin. */
export function heliLevel(t: number, outside: boolean): number {
  const p = heliProgress(t)
  return outside ? p : p * 0.3
}

export const SKY = { glow: '#ff7a2a', burn: '#ffa25a', blue: '#5e8fc8', high: '#8fb6dd', space: '#000000' }
export const CDR_HEAD: Vec3 = { x: -0.65, y: 1.15, z: 0.62 }
export const CMP_HEAD: Vec3 = { x: 0, y: 1.15, z: 0.62 }

export type SoundName = 'reentry' | 'static' | 'chute' | 'splash' | 'horn'

export interface Hooks {
  say(id: string, opts?: { focus?: Vec3 }): void
  playSound(name: SoundName): void
  setSky(color: string): void
  hideEarth(): void
  fadeOut(): void
  complete(): void
}

export function events(h: Hooks): TimelineEvent[] {
  return [
    { at: 0.8, run: () => h.say('act5.entry', { focus: CDR_HEAD }) },
    {
      at: 12.3,
      run: () => {
        h.setSky(SKY.glow)
        h.hideEarth()
        h.playSound('reentry')
      },
    },
    { at: 13.2, run: () => h.playSound('static') },
    { at: 13.2, run: () => h.say('act5.blackout', { focus: CMP_HEAD }) },
    { at: 17.5, run: () => h.setSky(SKY.burn) },
    { at: 19.5, run: () => h.setSky(SKY.blue) },
    { at: 21, run: () => h.playSound('chute') },
    { at: 26.3, run: () => h.say('act5.radar') },
    { at: 28.2, run: () => h.playSound('chute') },
    { at: 29, run: () => h.say('act5.mains', { focus: CDR_HEAD }) },
    { at: 30.5, run: () => h.setSky(SKY.high) },
    {
      at: SPLASH_AT + 0.1,
      run: () => {
        h.playSound('splash')
        h.say('act5.splash')
      },
    },
    { at: 50, run: () => h.say('act5.hornet') },
    { at: 52, run: () => h.playSound('horn') },
    { at: 62, run: () => h.say('act5.end') },
    { at: FADE_AT, run: () => h.fadeOut() },
    { at: COMPLETE_AT, run: () => h.complete() },
  ]
}

// Launch and TLI timeline data: shots, shake, events and the engine curve.
// Pure: events call injected hooks, so a test can record them. No Three.js or React imports.
import type { Shot, ShakeKey, TimelineEvent } from '../../timeline/timeline'
import type { Vec3 } from '../../types'

export type View = 'cabin' | 'pad' | 'space' | 'tli'

export interface NamedShot extends Shot {
  name: string
  view: View
}

export const PAD_X = 3000
export const SPACE_X = -3000
export const TLI_Z = 1200
/** Height of the stacks above the Earth's top point in the space set. */
export const SPACE_Y = 150
/** Height of the rocket base above the pad ground. */
export const PAD_BASE_Y = 18
export const LIFTOFF_AT = 4.5
export const IGNITION_AT = 3.5
export const STAGING_AT = 10

export const LAUNCH_DURATION = 16
export const TLI_DURATION = 15

/** Rocket height above the pad `t` seconds into the launch timeline. */
export function rocketHeight(t: number): number {
  return t <= LIFTOFF_AT ? 0 : (t - LIFTOFF_AT) ** 2 * 1.8
}

const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

export const LAUNCH_SHOTS: NamedShot[] = [
  {
    name: 'padFar',
    view: 'pad',
    from: 0,
    to: 3.3,
    fov: 50,
    far: 6000,
    cam: (u) => ({ position: v(PAD_X + lerp(-105, -90, u), 24, 175), lookAt: v(PAD_X - 10, 58, 0) }),
  },
  {
    name: 'padLow',
    view: 'pad',
    from: 5.2,
    to: 8.6,
    fov: 75,
    far: 6000,
    cam: (_u, t) =>
      ({ position: v(PAD_X + 70, 6, 60), lookAt: v(PAD_X, PAD_BASE_Y + rocketHeight(t) + 40, 0) }),
  },
  {
    name: 'staging',
    view: 'space',
    from: 10,
    to: 12.6,
    fov: 60,
    far: 9000,
    cam: (u) => ({ position: v(SPACE_X + lerp(60, 50, u), SPACE_Y + 12, 90), lookAt: v(SPACE_X, SPACE_Y - 8, 0) }),
  },
]

export const TLI_SHOTS: NamedShot[] = [
  {
    name: 'tli',
    view: 'tli',
    from: 0.4,
    to: 5.6,
    fov: 60,
    far: 9000,
    cam: (u) => ({
      position: v(SPACE_X + lerp(40, 28, u), SPACE_Y + lerp(50, 44, u), TLI_Z + 55),
      lookAt: v(SPACE_X, SPACE_Y - 6, TLI_Z),
    }),
  },
]

export const LAUNCH_SHAKE: ShakeKey[] = [
  { t: 0, amp: 0 },
  { t: 3, amp: 0 },
  { t: 4, amp: 0.05 },
  { t: 9, amp: 0.035 },
  { t: 10, amp: 0.09 },
  { t: 11, amp: 0.02 },
  { t: 15, amp: 0 },
]

export const TLI_SHAKE: ShakeKey[] = [
  { t: 0, amp: 0.03 },
  { t: 6, amp: 0.03 },
  { t: 7, amp: 0 },
]

/** The shot active at `t`, or null when the cabin shows. */
export function shotAt(shots: NamedShot[], t: number): NamedShot | null {
  return shots.find((s) => t >= s.from && t < s.to) ?? null
}

export const launchViewAt = (t: number): View => shotAt(LAUNCH_SHOTS, t)?.view ?? 'cabin'
export const tliViewAt = (t: number): View => shotAt(TLI_SHOTS, t)?.view ?? 'cabin'

/** Engine level 0 to 1 during the launch. */
export function engineLevel(t: number): number {
  if (t < IGNITION_AT) return 0
  if (t < 9.5) return (t - IGNITION_AT) / (9.5 - IGNITION_AT)
  if (t < STAGING_AT) return 1 - ((t - 9.5) / 0.5) * 0.7
  if (t < 11) return 0.3
  return Math.max(0, 0.3 - (t - 11) * 0.1)
}

/** Engine level during the TLI timeline: a burn from 0.2 s, ending about 6 s. */
export function tliEngineLevel(t: number): number {
  if (t < 0.2) return 0
  if (t < 1.2) return t - 0.2
  if (t < 5.8) return 1
  return Math.max(0, 1 - (t - 5.8) * 1.5)
}

export const alarmOn = (t: number): boolean => t >= 9.8 && t < 11.6

export const SKY = {
  pad: '#9db7c9',
  climb: '#4a6a8a',
  dark: '#1a2636',
  space: '#000000',
}

export interface LaunchHooks {
  say(id: string, opts?: { urgent?: boolean; onStart?: () => void }): void
  playSound(name: 'rumble' | 'launchRoar' | 'alarm' | 'staging'): void
  ignite(): void
  liftoff(): void
  setSky(color: string): void
  focusOverhead(): void
  focusO2(): void
}

/** The launch events, in the order the timeline runs them. */
export function launchEvents(h: LaunchHooks): TimelineEvent[] {
  return [
    { at: 0.5, run: () => h.say('act1.count') },
    { at: 3.2, run: () => h.playSound('rumble') },
    { at: IGNITION_AT, run: () => h.ignite() },
    {
      at: LIFTOFF_AT,
      run: () => {
        h.liftoff()
        h.say('act1.liftoff', { urgent: true })
      },
    },
    { at: 5.2, run: () => h.playSound('launchRoar') },
    { at: 7, run: () => h.setSky(SKY.climb) },
    { at: 9, run: () => h.setSky(SKY.dark) },
    { at: 9.8, run: () => h.playSound('alarm') },
    {
      at: STAGING_AT,
      run: () => {
        h.playSound('staging')
        h.say('act1.staging', { onStart: () => h.focusOverhead() })
      },
    },
    { at: 13, run: () => h.setSky(SKY.space) },
    { at: 14.5, run: () => h.say('act1.o2', { onStart: () => h.focusO2() }) },
  ]
}

export interface TliHooks {
  playSound(name: 'rumble'): void
  showEarth(): void
  /** Mike, then the commander, with the view on the window. */
  earthLines(): void
}

export function tliEvents(h: TliHooks): TimelineEvent[] {
  return [
    { at: 0.2, run: () => h.playSound('rumble') },
    { at: 6.5, run: () => h.showEarth() },
    { at: 7.2, run: () => h.earthLines() },
  ]
}

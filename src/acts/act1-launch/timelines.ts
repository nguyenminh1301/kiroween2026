// Launch and TLI timeline data: shots, shake, events and the engine curve.
// Pure: events call injected hooks, so a test can record them. No Three.js or React imports.
import type { Shot, TimelineEvent } from '../../timeline/timeline'
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
/**
 * Beat times of the short launch, in seconds of game time. The cabin shows from ignition to orbit shutdown for
 * about 10 s in all (see `cabinSeconds`); the outside shots carry the rest of the beats.
 */
export const TOWER_AT = 10.75
export const ROLL_AT = 12.6
export const ROLLOK_AT = 14.65
export const MAXQ_AT = 16.4
export const STAGINGGO_AT = 19.65
export const STAGING_AT = 23.2
export const JETTISON_AT = 25.05
export const SECOND_STAGE_AT = 26.4
export const THIRD_STAGE_AT = 27.2
export const SHUTDOWN_AT = 28
/** Orbit shutdown confirmed: the end of the cabin time the launch counts. */
export const ORBIT_AT = 29.35
/** The first outside shot (the pad low view) ends. */
export const PRINT_LIFTOFF_AT = 8.6

export const LAUNCH_DURATION = ORBIT_AT + 0.5
export const TLI_DURATION = 15
/** The alarm tone starts this long before staging. */
const ALARM_LEAD = 0.2

/** Rocket height above the pad `t` seconds into the launch timeline. */
export function rocketHeight(t: number): number {
  // The pad views end by 9 s. The height stays where it was after 12 s.
  const u = Math.min(t, 12)
  return u <= LIFTOFF_AT ? 0 : (u - LIFTOFF_AT) ** 2 * 1.8
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
    cam: (u) => ({ position: v(PAD_X + lerp(-95, -80, u), 22, 140), lookAt: v(PAD_X - 6, 56, 0) }),
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
    name: 'climb',
    view: 'space',
    from: 11.4,
    to: 15.4,
    fov: 58,
    far: 9000,
    cam: (u) => ({ position: v(SPACE_X + lerp(-70, -55, u), SPACE_Y + lerp(8, 20, u), 100), lookAt: v(SPACE_X, SPACE_Y + 4, 0) }),
  },
  {
    name: 'stack',
    view: 'space',
    from: 19.4,
    to: 22.8,
    fov: 52,
    far: 9000,
    cam: (u) => ({ position: v(SPACE_X + lerp(80, 66, u), SPACE_Y + lerp(26, 18, u), 110), lookAt: v(SPACE_X, SPACE_Y + 2, 0) }),
  },
  {
    name: 'staging',
    view: 'space',
    from: 22.8,
    to: 25,
    fov: 60,
    far: 9000,
    cam: (u) => ({ position: v(SPACE_X + lerp(60, 50, u), SPACE_Y + 12, 90), lookAt: v(SPACE_X, SPACE_Y - 8, 0) }),
  },
  {
    name: 'jettison',
    view: 'space',
    from: 25,
    to: 28,
    fov: 55,
    far: 9000,
    cam: (u) => ({ position: v(SPACE_X + lerp(-40, -34, u), SPACE_Y + 30, 70), lookAt: v(SPACE_X, SPACE_Y + 24, 0) }),
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

// The view shake lives in shake.ts.

/** The shot active at `t`, or null when the cabin shows. */
export function shotAt(shots: NamedShot[], t: number): NamedShot | null {
  return shots.find((s) => t >= s.from && t < s.to) ?? null
}

export const launchViewAt = (t: number): View => shotAt(LAUNCH_SHOTS, t)?.view ?? 'cabin'
export const tliViewAt = (t: number): View => shotAt(TLI_SHOTS, t)?.view ?? 'cabin'

/** Engine level 0 to 1 during the launch: first stage, a gap at staging, then the upper stages. */
export function engineLevel(t: number): number {
  if (t < IGNITION_AT) return 0
  if (t < TOWER_AT) return (t - IGNITION_AT) / (TOWER_AT - IGNITION_AT)
  if (t < STAGING_AT - 0.5) return 1
  if (t < STAGING_AT) return 1 - ((t - (STAGING_AT - 0.5)) / 0.5) * 0.7
  if (t < THIRD_STAGE_AT) return 0.3
  if (t < ORBIT_AT) return 0.2
  return Math.max(0, 0.2 - (t - ORBIT_AT) * 0.4)
}

/** Engine level during the TLI timeline: a burn from 0.2 s, ending about 6 s. */
export function tliEngineLevel(t: number): number {
  if (t < 0.2) return 0
  if (t < 1.2) return t - 0.2
  if (t < 5.8) return 1
  return Math.max(0, 1 - (t - 5.8) * 1.5)
}

export const alarmOn = (t: number): boolean => t >= STAGING_AT - ALARM_LEAD && t < STAGING_AT + 1.6

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
  /** A real moment of the flight happened in front of the player. */
  moment(id: string): void
  /** Slide in the print of a real photo. */
  print(id: string): void
}

/**
 * The launch events, in the order the timeline runs them. Lines are queued, never urgent: the radio plays them
 * in order and each has a short `seconds`, so a late line plays over the next outside shot.
 */
export function launchEvents(h: LaunchHooks): TimelineEvent[] {
  return [
    { at: 0.1, run: () => h.say('act1.count') },
    { at: 3.2, run: () => h.playSound('rumble') },
    { at: IGNITION_AT, run: () => h.ignite() },
    { at: 4.3, run: () => h.say('act1.count2') },
    {
      at: LIFTOFF_AT,
      run: () => {
        h.liftoff()
        h.say('act1.liftoff')
      },
    },
    { at: 5.2, run: () => h.playSound('launchRoar') },
    // The first outside shot ends: the real liftoff.
    { at: PRINT_LIFTOFF_AT, run: () => h.print('liftoff') },
    {
      at: TOWER_AT,
      run: () => {
        h.setSky(SKY.climb)
        h.say('act1.tower')
      },
    },
    { at: ROLL_AT, run: () => h.say('act1.roll') },
    {
      at: ROLLOK_AT,
      run: () => {
        h.setSky(SKY.dark)
        h.say('act1.rollok')
      },
    },
    { at: MAXQ_AT, run: () => h.say('act1.maxq') },
    { at: STAGINGGO_AT, run: () => h.say('act1.staginggo') },
    { at: STAGING_AT - ALARM_LEAD, run: () => h.playSound('alarm') },
    {
      at: STAGING_AT,
      run: () => {
        h.playSound('staging')
        h.say('act1.staging')
      },
    },
    {
      at: JETTISON_AT,
      run: () => {
        h.say('act1.jettison')
        h.moment('escape-tower')
      },
    },
    { at: SECOND_STAGE_AT, run: () => h.setSky(SKY.space) },
    { at: SHUTDOWN_AT, run: () => h.say('act1.shutdown') },
    { at: ORBIT_AT, run: () => h.say('act1.orbit') },
  ]
}

/**
 * Seconds the cabin is on screen between ignition and orbit shutdown: the time not covered by an outside shot.
 */
export function cabinSeconds(shots: NamedShot[] = LAUNCH_SHOTS): number {
  let sum = 0
  for (let t = IGNITION_AT; t < ORBIT_AT; t += 0.01) if (!shotAt(shots, t)) sum += 0.01
  return Math.round(sum * 10) / 10
}

export interface TliHooks {
  playSound(name: 'rumble'): void
  say(id: string): void
  showEarth(): void
  print(id: string): void
  /** The talk after the burn: the commander, Houston, Mike, Houston. The act finishes after the last line. */
  earthLines(): void
}

export const TLI_FLASHES_AT = 3
/** The Earth shows in the window at 6.5 s; the real photo of it follows. */
export const PRINT_EARTH_AT = 6.7

export function tliEvents(h: TliHooks): TimelineEvent[] {
  return [
    { at: 0.2, run: () => h.playSound('rumble') },
    { at: 0.3, run: () => h.say('act1.tliburn') },
    { at: 0.4, run: () => h.say('act1.tligo') },
    { at: TLI_FLASHES_AT, run: () => h.say('act1.flashes') },
    { at: 6.5, run: () => h.showEarth() },
    { at: PRINT_EARTH_AT, run: () => h.print('earth') },
    { at: 7.2, run: () => h.earthLines() },
  ]
}

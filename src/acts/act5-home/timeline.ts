// Act 5 timeline data: shots, shake, formulas and events. Pure: events call injected hooks,
// so a test can record them. No Three.js or React imports.
import type { Shot, TimelineEvent } from '../../timeline/timeline'
import type { Vec3 } from '../../types'
import { mainsOpen } from './chutes'
import { heliProgress, HORNET_OFFSET } from './heli'

export type View = 'cabin' | 'entry' | 'ocean'

export interface NamedShot extends Shot {
  name: string
  view: Exclude<View, 'cabin'>
}

export const ENTRY_X = -5000
export const OCEAN_X = 5000
/** The ending: the narrator, then the picture fades to black. With prints on, two more prints follow the narrator. */
export const DURATION = 73.5
/** Extra seconds after the narrator for the two last prints. */
export const PRINT_TAIL = 17
export const START_HEIGHT = 900
export const SPLASH_AT = 45
export const SPLASH_LEN = 7
export const COLLAR_AT = 56
export const FADE_AT = 71
export const FADE_LEN = 2
export const COMPLETE_AT = 73
/** The narrator's two part line, from 62 s, is done by then. */
export const END_DONE_AT = 71.4
/** Three escorts around the carrier, 1.3 to 1.9 km from the capsule, steaming slowly. Positions are at t = 0. */
export const ESCORTS = [
  { x: -700, z: -1100, yaw: 0.5, speed: 5 },
  { x: 1400, z: -1300, yaw: -0.4, speed: 5 },
  { x: -1500, z: -300, yaw: 1.3, speed: 4 },
] as const
export { HORNET_OFFSET, mainsOpen }

/** Escort `i` at time `t`: it steams along its heading (yaw 0 faces -z, positive turns left). */
export function escortAt(i: number, t: number): { x: number; z: number; yaw: number } {
  const e = ESCORTS[i]
  return { x: e.x - Math.sin(e.yaw) * e.speed * t, z: e.z - Math.cos(e.yaw) * e.speed * t, yaw: e.yaw }
}

/**
 * Real altitude in metres: the drogues open at about 7 km (24,000 ft) and the mains at about 3 km (10,000 ft).
 * The scene height below is a smaller stand-in for the last part of the fall.
 */
export const DROGUE_ALTITUDE = 7300
export const MAINS_ALTITUDE = 3050
const ALTITUDE_KEYS: ReadonlyArray<readonly [number, number]> = [
  [0, 122000],
  [12.3, 70000],
  [19.5, 15000],
  [21, DROGUE_ALTITUDE],
  [28.2, MAINS_ALTITUDE],
  [45, 0],
]
export function altitudeAt(t: number): number {
  if (t <= 0) return ALTITUDE_KEYS[0][1]
  for (let i = 1; i < ALTITUDE_KEYS.length; i++) {
    const [t1, a1] = ALTITUDE_KEYS[i]
    const [t0, a0] = ALTITUDE_KEYS[i - 1]
    if (t <= t1) return a0 + (a1 - a0) * ((t - t0) / (t1 - t0))
  }
  return 0
}

/** Sky tint after the blackout: 0 is deep blue at 15 km, 1 is the light blue of the low air. */
export const skyBlend = (t: number): number => {
  const x = clamp01((t - 19.5) / 14)
  return x * x * (3 - 2 * x)
}
/** Cloud layer height above the sea in the ocean set, metres. */
export const CLOUD_Y = 420

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
/** Splash progress, 0 to 1 from 45 s over 7 s. */
export const splashProgress = (t: number): number => clamp01((t - SPLASH_AT) / SPLASH_LEN)
export const collarProgress = (t: number): number => clamp01((t - COLLAR_AT) / 2)
/** Black level 0 to 1. `tail` is PRINT_TAIL when the last prints show, else 0. */
export const fadeLevel = (t: number, tail = 0): number => clamp01((t - FADE_AT - tail) / FADE_LEN)

/** Capsule position in the ocean set: height, then a small bob once it floats. */
export function capsuleY(t: number, wave = 0): number {
  return t < SPLASH_AT ? height(t) : 0.5 + wave
}

/** What the cabin windows show: plasma during the burn, sky under the parachutes, then the sea after splashdown. */
export function windowViewAt(t: number): 'sky' | 'plasma' | 'sea' {
  if (t >= SPLASH_AT) return 'sea'
  if (t >= 12.3 && t < 19.5) return 'plasma'
  return 'sky'
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
    // Behind and to one side, high over the Earth, drifting forward with the module. It flies toward +x.
    cam: (u) => ({ position: v(lerp(-15, -11, u), lerp(5.5, 5, u), lerp(17, 15, u)), lookAt: v(lerp(-6, -4, u), -3.5, 0) }),
  },
  {
    // Inside the air now: no stars, deep blue sky, the cover pops and the drogues shoot out.
    name: 'drogues',
    view: 'ocean',
    from: 20,
    to: 26,
    fov: 62,
    far: 6000,
    cam: (u, t) => {
      const y = height(t)
      return { position: v(lerp(14, 18, u), y + lerp(2, 6, u), lerp(26, 30, u)), lookAt: v(0, y + lerp(8, 14, u), 0) }
    },
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
      return { position: v(0, y - 4, 64), lookAt: v(0, y + 20, 0) }
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
      return { position: v(lerp(44, 36, u), y + lerp(10, 6, u), lerp(70, 56, u)), lookAt: v(0, y + lerp(18, 10, u), 0) }
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
    cam: (u) => ({
      position: v(lerp(7, 5, u), 1.5, lerp(-11, -13, u)),
      lookAt: v(HORNET_OFFSET.x * 0.45, 12, HORNET_OFFSET.z * 0.6),
    }),
  },
  {
    name: 'pull',
    view: 'ocean',
    from: 57,
    to: DURATION + PRINT_TAIL,
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

/** Moments the shake peaks: the drogues, the mains and the splash. */
export const KICKS: readonly number[] = [21, 28.2, SPLASH_AT]

/**
 * Cabin shake strength 0 to 1 at `t`. It follows the plasma heat, peaks at the top of the heating and kicks
 * at each chute opening and at the splash. The cap on the sample is the launch cap: 0.4 degrees and 1 cm.
 */
export function shakeEnvelope(t: number): number {
  let e = 0.7 * heat(t)
  const peak = Math.abs(t - 14)
  if (peak < 2) e += 0.3 * (1 - peak / 2)
  for (const k of KICKS) {
    const d = t - k
    if (d >= 0 && d < 0.9) e += 0.9 * (1 - d / 0.9)
  }
  return clamp01(e)
}

export function shotAt(t: number): NamedShot | null {
  return SHOTS.find((s) => t >= s.from && t < s.to) ?? null
}
export const viewAt = (t: number): View => shotAt(t)?.view ?? 'cabin'

/** Ocean ambience level: none before 31 s, full while a shot is outside, 0.35 in the cabin. */
export function oceanLevel(t: number, outside: boolean): number {
  if (t < 31) return 0
  // A soft bed under the voices: a little louder on the approach, quieter once afloat.
  if (t < SPLASH_AT) return outside ? 0.5 : 0.2
  return outside ? 0.22 : 0.1
}

/** Helicopter ambience level: rises with the approach, 0.3 of it in the cabin. */
export function heliLevel(t: number, outside: boolean): number {
  const p = heliProgress(t)
  return outside ? p : p * 0.3
}

export const SKY = { glow: '#ff7a2a', burn: '#ffa25a', blue: '#5e8fc8', high: '#8fb6dd', space: '#000000' }

export type SoundName = 'reentry' | 'static' | 'chute' | 'splash' | 'horn'

export interface Hooks {
  /** The cabin view stays forward on every line: no line turns it to a crewman. */
  say(id: string): void
  playSound(name: SoundName): void
  setSky(color: string): void
  hideEarth(): void
  fadeOut(): void
  /** A real moment of the flight happened in front of the player. */
  moment(id: string): void
  /** Slide in the print of a real photo. */
  print(id: string): void
  complete(): void
}

/**
 * Radio lines are queued in the order of the record. Each has a short `seconds`, so a late line
 * plays over the next shot and none is cut.
 */
export function events(h: Hooks, tail = 0): TimelineEvent[] {
  return [
    { at: 0.8, run: () => h.say('act5.cleared') },
    { at: 0.9, run: () => h.say('act5.gear') },
    {
      at: 12.3,
      run: () => {
        h.setSky(SKY.glow)
        h.hideEarth()
        h.playSound('reentry')
      },
    },
    { at: 9.8, run: () => h.say('act5.hill') },
    { at: 9.9, run: () => h.say('act5.later') },
    { at: 16, run: () => h.playSound('static') },
    { at: 16.2, run: () => h.say('act5.blackout') },
    { at: 17.5, run: () => h.setSky(SKY.burn) },
    { at: 18.6, run: () => h.say('act5.aria') },
    { at: 18.7, run: () => h.say('act5.airboss') },
    { at: 19.5, run: () => h.setSky(SKY.blue) },
    { at: 21, run: () => h.playSound('chute') },
    { at: 21.8, run: () => h.say('act5.drogues') },
    { at: 28.2, run: () => h.playSound('chute') },
    { at: 29, run: () => h.say('act5.mains') },
    { at: 30.5, run: () => h.setSky(SKY.high) },
    { at: 31, run: () => h.say('act5.hornet') },
    { at: 31.1, run: () => h.say('act5.hornetack') },
    { at: 38, run: () => h.say('act5.alt') },
    { at: 38.1, run: () => h.say('act5.swim') },
    {
      at: SPLASH_AT + 0.1,
      run: () => {
        h.playSound('splash')
        h.say('act5.splash')
      },
    },
    { at: SPLASH_AT + 2.4, run: () => h.say('act5.okay') },
    {
      at: 50,
      run: () => h.moment('hornet'),
    },
    { at: 52, run: () => h.playSound('horn') },
    { at: SPLASH_AT + 2.9, run: () => h.print('raft') },
    { at: 56.6, run: () => h.print('lifted') },
    { at: 62, run: () => h.say('act5.end') },
    // After the narrator: the crew walks to the quarantine trailer, then sits in it. Only when prints are on.
    ...(tail > 0
      ? [
          { at: END_DONE_AT, run: () => h.print('quarantineWalk') },
          { at: END_DONE_AT + 8.6, run: () => h.print('quarantineTrailer') },
        ]
      : []),
    { at: FADE_AT + tail, run: () => h.fadeOut() },
    { at: COMPLETE_AT + tail, run: () => h.complete() },
  ]
}

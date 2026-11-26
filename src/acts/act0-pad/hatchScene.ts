// The act 0 hatch scene: handle turn, hatch swing, fade. Pure: sounds and lines are injected.
// No Three.js or React imports.
import type { TimelineEvent } from '../../timeline/timeline'

export const HANDLE_TURN = 1.6
export const HATCH_OPEN = 1.45
export const HATCH_SCENE_DURATION = 5.2

const HANDLE_FROM = 0.2
const HANDLE_TO = 1.2
const SWING_FROM = 1.7
const SWING_TO = 3.2
const FADE_FROM = 3.6
const FADE_TO = 4.8

const smooth = (a: number, b: number, t: number): number => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** Handle angle in radians at `t` seconds into the scene. */
export const handleAngle = (t: number): number => smooth(HANDLE_FROM, HANDLE_TO, t) * HANDLE_TURN

/** Hatch swing angle in radians at `t`. */
export const hatchAngle = (t: number): number => smooth(SWING_FROM, SWING_TO, t) * HATCH_OPEN

/** Black level 0 to 1 at `t`. */
export const hatchFade = (t: number): number => smooth(FADE_FROM, FADE_TO, t)

export interface HatchHooks {
  playSound(name: 'switch' | 'creak' | 'hiss'): void
  /** The commander's line from inside. */
  say(id: string): void
  complete(): void
}

export function hatchEvents(h: HatchHooks): TimelineEvent[] {
  return [
    { at: HANDLE_FROM, run: () => h.playSound('switch') },
    { at: HANDLE_TO, run: () => h.playSound('hiss') },
    { at: SWING_FROM, run: () => h.playSound('creak') },
    { at: 2.6, run: () => h.say('act0.board') },
    { at: HATCH_SCENE_DURATION, run: () => h.complete() },
  ]
}

export type EffectName =
  | 'switch' | 'breakerPush' | 'hatchSlam' | 'key' | 'alarm' | 'staging' | 'launchRoar' | 'rumble'
  | 'reentry' | 'chute' | 'splash' | 'horn' | 'locker' | 'zipper' | 'grab' | 'static'
  | 'creak' | 'groan' | 'knock' | 'scrape' | 'click' | 'sting' | 'breathe' | 'cheer'
  | 'tap' | 'hiss' | 'gasp' | 'cage' | 'shutter' | 'clang' | 'readout'

export interface EffectDef {
  files: readonly string[]
  gain: number
}

const groans = ['hull_groan_1', 'hull_groan_2', 'hull_groan_3']

export const EFFECTS: Record<EffectName, EffectDef> = {
  switch: { files: ['toggle_switch'], gain: 0.7 },
  breakerPush: { files: ['breaker_push'], gain: 0.8 },
  hatchSlam: { files: ['hatch_slam'], gain: 1 },
  key: { files: ['dsky_key'], gain: 0.6 },
  alarm: { files: ['master_alarm'], gain: 0.5 },
  staging: { files: ['staging_bang'], gain: 0.9 },
  launchRoar: { files: ['launch_exterior'], gain: 1 },
  rumble: { files: ['launch_rumble'], gain: 1 },
  reentry: { files: ['reentry_roar'], gain: 0.9 },
  chute: { files: ['parachute_open'], gain: 0.9 },
  splash: { files: ['splash_impact'], gain: 1 },
  horn: { files: ['ship_horn'], gain: 0.6 },
  locker: { files: ['locker_door'], gain: 0.7 },
  zipper: { files: ['zipper'], gain: 0.6 },
  grab: { files: ['handrail_grab'], gain: 0.35 },
  static: { files: ['static_burst'], gain: 0.5 },
  creak: { files: groans, gain: 0.8 },
  groan: { files: groans, gain: 0.9 },
  knock: { files: ['knock_1', 'knock_2'], gain: 0.9 },
  scrape: { files: ['creature_scrape_1', 'creature_scrape_2'], gain: 1 },
  click: { files: ['creature_click_1', 'creature_click_2', 'creature_click_3'], gain: 0.9 },
  sting: { files: ['creature_scream'], gain: 1 },
  breathe: { files: ['creature_breath'], gain: 0.5 },
  cheer: { files: ['crowd_cheer'], gain: 0.8 },
  // No recorded files: these always play their synthesized stand-ins.
  tap: { files: [], gain: 0.9 },
  hiss: { files: [], gain: 0.35 },
  gasp: { files: [], gain: 0.8 },
  cage: { files: [], gain: 0.8 },
  shutter: { files: [], gain: 0.8 },
  clang: { files: [], gain: 0.4 },
  readout: { files: [], gain: 0.25 },
}

/**
 * A random loaded file of the effect, or null when none is loaded
 * (the caller then plays the synthesized stand-in). `rand` returns 0 to 1.
 */
export function pickEffectFile(
  name: EffectName,
  isLoaded: (file: string) => boolean,
  rand: () => number = Math.random,
): string | null {
  const def = EFFECTS[name]
  if (!def) return null
  const ok = def.files.filter(isLoaded)
  if (ok.length === 0) return null
  const r = rand()
  const i = Number.isFinite(r) ? Math.min(ok.length - 1, Math.max(0, Math.floor(r * ok.length))) : 0
  return ok[i]
}

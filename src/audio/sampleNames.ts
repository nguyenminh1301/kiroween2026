/** The 40 recordings in public/audio, without the .mp3 extension. */
export const SAMPLE_NAMES: readonly string[] = [
  'breaker_push', 'chase_loop', 'creature_breath', 'creature_click_1', 'creature_click_2',
  'creature_click_3', 'creature_scrape_1', 'creature_scrape_2', 'creature_scream', 'crowd_cheer',
  'drone_loop', 'dsky_key', 'engine_room_loop', 'footsteps_grating', 'handrail_grab',
  'hatch_slam', 'heartbeat_loop', 'helicopter_loop', 'helmet_breath_loop', 'hull_groan_1',
  'hull_groan_2', 'hull_groan_3', 'knock_1', 'knock_2', 'launch_exterior',
  'launch_rumble', 'locker_door', 'master_alarm', 'ocean_loop', 'pad_wind_loop',
  'parachute_open', 'reentry_roar', 'ship_horn', 'ship_hum_loop', 'splash_impact',
  'staging_bang', 'static_burst', 'toggle_switch', 'vent_loop', 'zipper',
]

/** Ids of the lines that have a vo file. */
export function voicedIds(lines: Record<string, { voiced?: boolean }>): string[] {
  return Object.keys(lines).filter((id) => lines[id].voiced === true)
}

/** Key used in `loaded()` and the buffer map for a vo file. */
export const voKey = (id: string): string => `vo/${id}`

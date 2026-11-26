# Credits

Rows marked TODO still need the source URL and license confirmed before submission.

## Audio

Recordings in `public/audio/`, trimmed, converted to mono MP3 and loudness-normalized. Everything else (birds, Quindar tones, chirps, and a fallback for any file that fails to load) is synthesized in code (`src/audio/`).

| File | Original download | Source | License |
|------|-------------------|--------|---------|
| `ship_hum_loop.mp3` | 1.1 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `engine_room_loop.mp3` | 1.2 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `vent_loop.mp3` | 2 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `drone_loop.mp3` | 3 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `chase_loop.mp3` | 4 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `creature_breath.mp3` | 5 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `creature_click_1..3.mp3` | 6.1, 6.2, 6.3 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `creature_scrape_1..2.mp3` | 7.1, 7.2 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `creature_scream.mp3` | 8 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `knock_1..2.mp3` | 9.1, 9.2 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `hull_groan_1..3.mp3` | 10 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `heartbeat_loop.mp3` | 11 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `helmet_breath_loop.mp3` | 12 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `launch_rumble.mp3` | 13 | TODO: source URL | TODO: license (must be CC0 or public domain) |
| `breaker_push.mp3` | circuit breaker.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `hatch_slam.mp3` | heavy metal door slam.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `toggle_switch.mp3` | toggle switch.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `dsky_key.mp3` | calculator button press.ogg (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `master_alarm.mp3` | master caution alarm.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `launch_exterior.mp3` | ocket launch.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `staging_bang.mp3` | pyrotechnic.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `reentry_roar.mp3` | wind roar rumble.mp3 (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `parachute_open.mp3` | parachute opening.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `splash_impact.mp3` | big water splash.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `ship_horn.mp3` | ship horn.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `locker_door.mp3` | metal locker door.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `zipper.mp3` | ziper close.flac (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `handrail_grab.mp3` | glove grab.wav (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `static_burst.mp3` | radio static.flac (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `ocean_loop.mp3` | open ocean waves loop.wav (seamless 24 s loop) (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `pad_wind_loop.mp3` | wind open field loop.wav (seamless 20 s loop) (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `helicopter_loop.mp3` | helicopter hover loop.wav (seamless 5 s loop) (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |
| `footsteps_grating.mp3` | footsteps_grating.wav (seamless 8 s loop) (freesound, CC0 filter) | TODO: source URL | TODO: confirm CC0 |

## Voices and generated sound

| What | Tool | Notes |
|------|------|-------|
| All spoken lines in `public/audio/vo/` | ElevenLabs text to speech (premade voices) | Generated for the earlier build of this game and copied in as finished files. Created with ElevenLabs, free plan: attribution required, check the plan terms before any commercial use. |
| `public/audio/vo/act0.intro1.mp3` | ElevenLabs text to speech | Narrator, act 0. Same terms as above. |
| `public/audio/vo/act0.intro2.mp3` | ElevenLabs text to speech | Narrator, act 0. Same terms as above. |
| `public/audio/vo/act5.end.mp3` | ElevenLabs text to speech | Narrator, act 5. Same terms as above. |
| `public/audio/crowd_cheer.mp3` | ElevenLabs sound effects | Same terms as above. |


## Fonts

Loaded from Google Fonts in `index.html`.

| Font | License |
|------|---------|
| Jost | OFL-1.1 |
| IBM Plex Mono | OFL-1.1 |
| Courier Prime | OFL-1.1 |
| Special Elite | Apache-2.0 |

## Apollo Guidance Computer source

The act 4 liftoff screen and the Archive quote the routine name `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE` from the Apollo 11 lunar module program.

| What | Source | License |
|------|--------|---------|
| Luminary099, `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc` | https://github.com/chrislgarry/Apollo-11 (transcribed by Virtual AGC and the MIT Museum) | Public domain |

## Images

| File | Source | License |
|------|--------|---------|
| `public/img/as11-40-5875.jpg` | NASA, Apollo 11, July 20, 1969, photo AS11-40-5875 (Buzz Aldrin beside the flag). https://www.hq.nasa.gov/alsj/a11/images11.html | Public domain (NASA) |

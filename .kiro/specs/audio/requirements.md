# Requirements: audio

## Introduction

This spec builds all game sound: the Web Audio graph, loading of the recordings in `public/audio/`, a synthesized fallback for every sound, positional sound, ambience beds, breathing and heartbeat, tension layers, and the radio queue with Quindar tones. The game must run with no audio at all. Pure logic lives in plain `.ts` files with no Three.js or React import. The game loop never goes through React state.

## Glossary

- **Audio**: the singleton in `src/audio/` (`audio.unlock()`, `audio.play()`, `audio.setScene()`, `audio.stopAll()`).
- **Bus**: a gain node into the master gain: `ambience` 0.5, `sfx` 0.8, `voice` 0.9, `body` 0.7.
- **Sample**: a decoded file from `public/audio/<name>.mp3`, or `public/audio/vo/<lineId>.mp3` for a voiced line.
- **Effect**: a named one-shot (table in 3.2) with files, a gain and a synth fallback.
- **Scene**: the ambience settings an act sets (requirement 4).
- **Radio**: the queue that shows and voices dialogue lines.
- **Game time**: time advanced by the frame driver. It does not advance while paused.

## Requirements

### 1. Graph and unlock

1.1 One `AudioContext` is created and resumed by `audio.unlock()`. Calling it again is safe. In the sandbox, the first click or key press calls it.
1.2 The four buses feed one master gain. The master gain follows `settings.volume` and ramps over 50 ms when it changes.
1.3 No audio function throws. If the context cannot be created, every call is a no-op, the radio still shows subtitles and runs its timing, and the game runs.
1.4 When the game pauses, the ambience bus drops to 30% of its level and no new one-shot Effect is scheduled. Resume restores it.
1.5 Radio timing runs on game time from a frame system. Pausing holds the current line on screen and holds the gap timer.
1.6 `audio.stopAll()` cuts every source. Unloading an act stops every source the act started: the act registers a cleanup through the cleanup registry. The cleanup also clears the radio, the scene and the body and tension store fields.

### 2. Samples

2.1 After unlock, `audio` fetches and decodes the 40 files in `public/audio/*.mp3` by name, and the vo file of every line with `voiced: true`, in the background.
2.2 Loading never blocks the game. A failed fetch or decode leaves that name missing and does not throw.
2.3 `audio.loaded()` returns the names that decoded (voice files as `vo/<lineId>`).

### 3. Effects

3.1 `audio.play(name, { position?, gain?, rate? })` plays a random loaded file of the Effect. If none is loaded it plays the synthesized stand-in. Every Effect has a stand-in made of oscillators and filtered noise.
3.2 Effects (files, gain):
- switch toggle_switch 0.7; breakerPush breaker_push 0.8; hatchSlam hatch_slam 1; key dsky_key 0.6
- alarm master_alarm 0.5; staging staging_bang 0.9; launchRoar launch_exterior 1; rumble launch_rumble 1
- reentry reentry_roar 0.9; chute parachute_open 0.9; splash splash_impact 1; horn ship_horn 0.6
- locker locker_door 0.7; zipper zipper 0.6; grab handrail_grab 0.35; static static_burst 0.5
- creak hull_groan_1..3 0.8; groan hull_groan_1..3 0.9; knock knock_1..2 0.9; scrape creature_scrape_1..2 1
- click creature_click_1..3 0.9; sting creature_scream 1; breathe creature_breath 0.5; cheer crowd_cheer 0.8
3.3 With `position`, the Effect plays through an HRTF panner, inverse distance model, refDistance 3. The listener follows the player eye and yaw. Without `position` it plays in the head.
3.4 `audio.playing()` lists the names of the loops and Effects sounding now.

### 4. Ambience scene

4.1 `audio.setScene(partial)` sets the scene. Any field left out resets to its default. Fields: `hum` 0 to 1 (default 1), `bed` 'ship' | 'engine' | 'none' (default 'ship'), `vent` 0 to 1, `wind` 0 to 1, `birds` boolean (default off), `ocean` 0 to 1, `heli` 0 to 1, `steps` 0 to 1, `breath` boolean (default on). Numeric inputs are clamped, NaN counts as 0.
4.2 Files: bed 'ship' ship_hum_loop, 'engine' engine_room_loop; vent vent_loop; wind pad_wind_loop; ocean ocean_loop; heli helicopter_loop; steps footsteps_grating. `hum` is the level of the bed.
4.3 Loops fade in and out over about 1.5 s when the scene changes.
4.4 The synth fallback for the hum is three drones at 55, 110.5 and 164.8 Hz under filtered noise. Every other loop has a synthesized looping stand-in.
4.5 `birds` plays a synthesized dawn chirp now and then, on game time.

### 5. Body

5.1 The store has `heartRate` (bpm, default 72, clamped to 60 to 180, NaN becomes 60) and `holdingBreath` (default false).
5.2 Breaths per minute are linear in heart rate: 60 bpm gives 12, 180 gives 40, clamped to 12 to 40. NaN counts as 60.
5.3 Breathing is a filtered-noise breath curve at that rate, or `helmet_breath_loop` with its playback rate following the breath rate. It plays only while `breath` is on in the scene. `holdingBreath` silences it.
5.4 The heartbeat is `heartbeat_loop` or a synthesized low double thump. It is silent at 100 bpm and below, and its level rises linearly to full at 180.

### 6. Tension

6.1 The store has `tension`: 'CALM' | 'UNEASE' | 'STALK' | 'CHASE' | 'RELEASE' (default CALM).
6.2 Levels (drone, pulse, whine): CALM 0/0/0, UNEASE 0.35/0/0, STALK 0.8/0/0.15, CHASE 0.5/1/0.7, RELEASE 0.4/0/0.1.
6.3 Drone uses `drone_loop`, pulse uses `chase_loop`, whine is a synthesized pair of slightly detuned high sines. Levels glide over about 2 s.

### 7. Radio

7.1 Lines live in `src/content/subtitles.ts` as `{ speaker, text, mood?, voiced?, seconds? }` keyed by id. Speakers: CDR, CMP, CAPCOM, LOS, UNKNOWN, PAD, NARRATOR, HORNET. Display names: NEIL ARMSTEAD, MIKE COLLIER, HOUSTON, NO SIGNAL, HOUSTON?, GUNTER WENT, '' (none), USS HORNET. Moods: whisper, shout, distant.
7.2 This spec adds only `test.capcom` (CAPCOM, "Columbia, Houston. Radio check.", 2.5 s), `test.los` (LOS, "[static]", 2 s), `act0.intro1` and `act0.intro2` (NARRATOR, voiced, text as given in the task brief).
7.3 Reading time is `seconds` if set, otherwise `max(2.4, 1.2 + text.length / 15)`.
7.4 `radio.say(id, opts)` queues a line and returns a Promise that resolves when the line ends. An unknown id resolves at once and does nothing. Lines play one at a time with a 0.35 s gap. Options: `urgent` (end the current line, clear the queue, say this now), `position`, `detuneHz`, `speaker` (override), `onStart`.
7.5 While a line plays the store field `subtitle` is `{ speaker, text, mood, key }`. It is null when no line plays.
7.6 Delivery, in this order:
- Voiced: the vo file. The line lasts file length + 0.3 s, never less than 60% of reading time. With no file it lasts the reading time.
- Ground (CAPCOM, HORNET): Quindar tone, band-passed static near 1800 Hz under the line, Quindar tone at the end. The line lasts reading time + 2 tone lengths.
- With `position`: a muffled murmur from that point, noise syllables band-passed 500 to 1200 Hz in an uneven rhythm, at most 2.6 s.
- LOS: the `static` Effect.
- Everyone else: a two-note chirp, 660 Hz then 880 Hz, 60 ms apart.
7.7 Quindar tones: a sine at 2525 Hz before and 2475 Hz after, each 0.25 s, 5 ms ramps, gain 0.12. `detuneHz` is added to both. NaN counts as 0.
7.8 `audio.radioQueue()` lists the queued and playing line ids. Pausing the game also pauses the vo file.

### 8. Sandbox, debug and e2e

8.1 Sandbox keys: 1 queues `test.capcom`, 2 `test.los`, 3 `act0.intro1`, 4 plays `knock` at a box in the room, 5 cycles tension. The ambience is the ship bed with breathing. The subtitle prints as plain text.
8.2 `window.__los.audio` has `loaded()`, `playing()` and `radioQueue()`.
8.3 `e2e/audio.mjs` runs in `npm run e2e` and follows the five steps of the task brief.

### 9. Credits

9.1 Every row of `docs/reference/audio-credits.md` is in `CREDITS.md` with its TODO markers kept.

## Required tests

Quindar frequencies (with and without detune, NaN detune); breath rate mapping (60, 120, 180, out of range, NaN); tension table; line duration; radio queue on a fake clock (order, 0.35 s gap, urgent clears, promise resolves at the end, no time advance holds the line); effect lookup (loaded sample chosen, synth fallback otherwise). All other tests are optional.

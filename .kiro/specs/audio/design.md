# Design: audio

## Layout

```
src/content/subtitles.ts      LINES, SPEAKER_NAMES, Line and Speaker types (text only)
src/audio/
  sampleNames.ts   SAMPLE_NAMES (the 40 file names), voFiles(lines)
  effects.ts       EFFECTS table, pickEffectFile(name, isLoaded, rand)      pure
  quindar.ts       quindarFreqs(detuneHz), QUINDAR constants                pure
  bodyMath.ts      breathRate(hr), clampHeartRate, heartbeatLevel(hr), breathEnvelope(phase)  pure
  tension.ts       TENSION_LEVELS, tensionLevels(state)                     pure
  scene.ts         Scene type, DEFAULT_SCENE, resolveScene(partial)         pure
  lineTiming.ts    readingSeconds(line), lineSeconds(line, plan)            pure
  radioQueue.ts    createRadioQueue(deps), tick(dt)                         pure
  delivery.ts      deliveryKind(speaker, opts, line), murmurSyllables(rand) pure
  loopSynth.ts     makeLoopData(kind, sampleRate) Float32Array stand-ins    pure
  recipes.ts       synth recipes per Effect (data)                          pure data
  engine.ts        AudioContext, buses, loader, play, loops, listener (the only Web Audio file)
  ambience.ts      loop channels, scene fades, birds, breath, heartbeat, tension layers
  radio.ts         the radio singleton: queue + engine delivery
  session.ts       startAudioSession(): frame system, listener update, cleanup registration
  index.ts         exports `audio` and `radio`
```

Pure files import no Web Audio types beyond plain numbers. `engine.ts`, `ambience.ts`, `radio.ts` and `session.ts` use Web Audio but never Three.js or React. Every public function wraps its body in `safe()` (try/catch that returns a fallback), so nothing throws.

## Store additions (`src/engine/store.ts`)

`heartRate: number` (72, `setHeartRate` clamps, NaN gives 60), `holdingBreath: boolean`, `tension: TensionState`, `subtitle: Subtitle | null` with `Subtitle = { speaker: Speaker; text: string; mood: Mood | null; key: number }`. `TensionState` and the subtitle types live in `src/types.ts` (shared). `speaker` is the id (after override); names come from `SPEAKER_NAMES`.

## Graph

```
effect/loop source -> [panner] -> gain -> bus -> master -> destination
```
Buses: ambience 0.5, sfx 0.8, voice 0.9, body 0.7. Master follows `settings.volume` by `linearRampToValueAtTime(v, now + 0.05)`. A store subscription (installed at unlock) handles `settings.volume` and `paused`. On pause the ambience bus ramps to 0.5 * 0.3 over 0.1 s, `play()` returns at once, and the current voiced line is paused (the source stops and its offset is kept). On resume it restores.

Listener: `session.ts` updates the listener each frame from the player eye position and forward vector `(-sin(yaw)cos(pitch), sin(pitch), -cos(yaw)cos(pitch))`, up (0,1,0). It uses `positionX.value` etc. when present, otherwise `setPosition` and `setOrientation`.

## Loading

`SAMPLE_NAMES` lists the 40 names. After the first `unlock()`, `engine.load()` starts one `fetch('/audio/<name>.mp3')` plus `decodeAudioData` per name (and `/audio/vo/<id>.mp3` per voiced line), all in separate promises that catch their own errors. `loaded()` returns the keys of the buffer map. The map is the only source of truth for effect lookup.

## Effects

`EFFECTS: Record<EffectName, { files: string[]; gain: number }>`. `pickEffectFile(name, isLoaded, rand)` filters files by `isLoaded` and returns one by `rand()`, or null. `engine.play` uses the file when non-null, else `recipes[name]`. A recipe is a list of layers `{ at, dur, kind: 'osc'|'noise', wave?, f0, f1?, filter?: { type, f, q? }, gain, attack? }`. One interpreter schedules them on the context: an oscillator or a looped noise buffer, a biquad, an envelope gain. `playing()` tracks each started Effect in a set until `onended`.

## Ambience

`resolveScene(partial)` fills defaults and clamps. Channels: `bed` (file by `scene.bed`, level `hum`), `vent`, `wind`, `ocean`, `heli`, `steps`, `breath`. Each channel owns a looping source and a gain. `setScene` computes the target level per channel and ramps with `setTargetAtTime(level, now, 0.5)` (about 1.5 s). A channel starts its source when its target first becomes above 0 and stops it a little after it reaches 0. The source is the sample if loaded, else an `AudioBuffer` filled by `makeLoopData`: hum (10 s, so 55, 110.5 and 164.8 Hz all cut on whole cycles, plus low-passed noise), vent, wind, ocean, heli, steps, drone, pulse. A channel started before its sample decodes keeps the stand-in until it is next started. Birds: a frame timer (game time, 2 to 6 s) schedules a chirp recipe.

## Body

A frame system accumulates a breath phase at `breathRate(hr) / 60` cycles per second. With samples, `helmet_breath_loop.playbackRate = breathRate / 12` (clamped 0.5 to 2.5). With the stand-in, a looping noise source through a band-pass has its gain set from `breathEnvelope(phase)` each frame. `holdingBreath` or `breath: false` ramps the gain to 0 over 0.2 s. The heartbeat uses `heartbeat_loop` at gain `heartbeatLevel(hr)` when a sample is loaded, otherwise a frame timer at the heart rate schedules a double thump recipe on the body bus with the same gain. Level is 0 at or below 100 bpm.

## Tension

Three channels: drone (`drone_loop`), pulse (`chase_loop`), whine (two sines 2200 and 2207 Hz). A frame system reads `tension`, looks up `TENSION_LEVELS`, and calls `setTargetAtTime(level, now, 0.5)` (about 2 s) when the state changes. A source starts when its level first exceeds 0.

## Radio

`createRadioQueue({ lines, plan, start, setSubtitle })` holds `queue`, `current`, `gap` and a key counter. `say` pushes an item and a resolver; if idle and the gap is spent it starts at once. `tick(dt)` lowers the current line's time and the gap; when a line ends it calls the handle's `stop`, clears the subtitle, resolves, sets the gap to 0.35 and starts the next item when the gap reaches 0. `urgent` ends the current line, resolves and drops queued items, then starts. `plan(line, opts)` returns `{ kind, seconds }` using `deliveryKind` and `lineSeconds`. `start(id, line, opts, plan)` returns a handle `{ stop(), pause(), resume() }` from the engine, or null with no audio. `ids()` returns the current id then queued ids. The session registers the tick as a pausable frame system, so a pause holds the line.

Deliveries (engine side): `voiced` plays the vo buffer on the voice bus. `ground` plays Quindar pre at t, static (noise through a band-pass at 1800 Hz, gain 0.15) from t + 0.25 for the reading time, Quindar post at t + 0.25 + reading. `murmur` plays syllables from `murmurSyllables(rand)` (at most 2.6 s, each a noise burst through a band-pass between 500 and 1200 Hz) on a panner at `position`. `los` calls `play('static')`. `chirp` plays two 50 ms sines at 660 and 880 Hz, the second 60 ms later.

## Debug and sandbox

`LosDebug.audio = { loaded, playing, radioQueue }` in `src/app/debug.ts`. The sandbox start calls `startAudioSession()`, `audio.setScene({ bed: 'ship', breath: true })`, and adds listeners: first `pointerdown` or `keydown` calls `audio.unlock()`; keys Digit1 to Digit5 as in 8.1. The knock box is an extra obstacle-sized mesh at a fixed spot (a plain `OBSTACLES` entry) used as the sound position. The subtitle shows in a plain DOM element in `App.tsx` for debug URLs only, subscribed to the store.

## Properties and tests

Only the six items in "Required tests" are required. They sit next to their files: `quindar.test.ts`, `bodyMath.test.ts`, `tension.test.ts`, `lineTiming.test.ts`, `radioQueue.test.ts`, `effects.test.ts`.

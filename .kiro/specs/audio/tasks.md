# Implementation Plan: audio

Eight top-level tasks. Each ends with `npm run test`, `npm run lint` and one conventional commit with no trailers. The first commit also includes `.kiro/specs/audio/`. Commit the spec folder again if requirements, design or tasks change. Optional tasks are marked `*`. Do not touch `public/audio/` or `docs/reference/`.

## Tasks

- [ ] 1. Pure logic and store fields
  - Add `heartRate`, `holdingBreath`, `tension`, `subtitle` and setters to the store, and the shared types to `src/types.ts`
  - Create `src/content/subtitles.ts` with the four lines and `SPEAKER_NAMES`
  - Create `quindar.ts`, `bodyMath.ts`, `tension.ts`, `scene.ts`, `lineTiming.ts`, `effects.ts`, `sampleNames.ts`
  - Tests: `quindar.test.ts`, `bodyMath.test.ts`, `tension.test.ts`, `lineTiming.test.ts`, `effects.test.ts`
  - _Requirements: 3.2, 4.1, 5.1, 5.2, 5.4, 6.1, 6.2, 7.1, 7.2, 7.3, 7.7_

- [ ] 2. Radio queue
  - Create `delivery.ts` (`deliveryKind`, `murmurSyllables`) and `radioQueue.ts`
  - Test: `radioQueue.test.ts` on a fake clock (order, 0.35 s gap, urgent clears, promise resolves, no time holds the line)
  - _Requirements: 1.5, 7.4, 7.5, 7.6, 7.8_

- [ ] 3. Audio engine: graph, unlock, loading
  - Create `engine.ts` (context, buses, master volume ramp, pause duck, loader, `loaded()`, `stopAll()`, listener) and `index.ts`
  - All calls wrapped so nothing throws, with no-op behaviour if the context cannot be made
  - _Requirements: 1.1 to 1.4, 1.6, 2.1 to 2.3_

- [ ] 4. Effects with synth fallback
  - Create `recipes.ts` and the `play` implementation (sample first, recipe otherwise, optional HRTF panner, `playing()`)
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 5. Ambience, body and tension
  - Create `loopSynth.ts` and `ambience.ts`: scene channels with 1.5 s fades, birds, breathing, heartbeat, tension layers
  - _Requirements: 4.1 to 4.5, 5.3, 5.4, 6.3_

- [ ] 6. Radio delivery and session
  - Create `radio.ts` (voiced, ground with Quindar, murmur, LOS, chirp) and `session.ts` (frame systems, listener, cleanup registration)
  - _Requirements: 1.5, 1.6, 7.4 to 7.8_

- [ ] 7. Sandbox and debug contract
  - Sandbox start: session, scene, unlock listener, keys 1 to 5, knock box, plain-text subtitle; `window.__los.audio`
  - _Requirements: 8.1, 8.2_

- [ ] 8. E2E and final checks
  - Create `e2e/audio.mjs`, add it to `npm run e2e`, note it in `e2e/README.md`
  - Confirm every row of `docs/reference/audio-credits.md` is in `CREDITS.md`
  - Run test, lint, build, check-budget, check-copy and e2e
  - _Requirements: 8.3, 9.1_

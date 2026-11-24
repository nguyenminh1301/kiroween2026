# Implementation Plan: engine-core

## Overview

Implementation language is TypeScript (strict), as in the design. Pure logic goes in plain `.ts` files with no Three.js or React import, and each has a `foo.test.ts` next to it. Property tests use `fast-check` with at least 100 runs and carry a comment such as `// Feature: engine-core, Property 14: ...`.

There are 10 top-level tasks and each ends with one commit. The last sub-task of every task runs `npm run test` and `npm run lint`, then commits only that task's files with a short conventional message and no trailers (repo rule 1 and 2). Do not touch `public/audio/` or `docs/reference/`. Task 10 runs the full done-when checklist.

The order is: foundations, settings, input and pointer lock, collision, player body and movement, timelines, focus, act loader, sandbox and app wiring, then e2e and final checks.

## Tasks

- [x] 1. Frame loop, store, act order and cleanup registry
  - [x] 1.1 Add shared types and act order
    - Extend `src/types.ts` with `Vec3`, `MoveMode`, and keep `ActId` as defined in structure rules
    - Create `src/engine/actOrder.ts` with `ACT_ORDER` and `nextAct`
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 1.2 Implement the frame driver
    - Create `src/engine/frameDriver.ts` (register, ordered `step`, dt clamp to 0.05, pausable flag, Game_Time, snapshot iteration so mid-frame unregister is safe)
    - Create `src/engine/FrameDriver.tsx`, the only `useFrame` caller, driving one module-level driver
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 1.3 Implement the cleanup registry
    - Create `src/engine/cleanupRegistry.ts` with `register` and `runAll` (reverse order, per-function try/catch, clears itself)
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 1.4 Implement the vanilla game store
    - Create `src/engine/store.ts` with `createStore`, the fields and defaults from the design, all setters, and dedup-insert `addAnomalySeen`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_

  - [x]* 1.5 Write property test for frame ordering
    - **Property 1: Frame ordering**
    - **Validates: Requirements 1.1, 1.2**

  - [x]* 1.6 Write property test for unregister safety
    - **Property 2: Unregister stops future calls, mid-frame mutation is safe**
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [x]* 1.7 Write property test for pausable systems and Game_Time
    - **Property 3: Pausable systems and Game_Time accumulation**
    - **Validates: Requirements 1.6, 1.7, 1.8, 1.10**

  - [x]* 1.8 Write property test for act order traversal
    - **Property 45: Act order traversal**
    - **Validates: Requirements 16.2, 16.3, 16.6**

  - [x]* 1.9 Write property test for cleanup registry
    - **Property 49: Cleanup runs exactly once, in reverse order, tolerating throws**
    - **Validates: Requirements 18.2, 18.3, 18.4**

  - [x]* 1.10 Write property test and unit tests for the store
    - **Property 12: Anomaly dedup-insert**
    - Unit tests for initial state and setter shapes
    - **Validates: Requirements 6.3, 6.5, 6.6, 6.7**

  - [x] 1.11 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add frame loop, store, act order and cleanup registry`
    - Commit only the files from this task

- [x] 2. Settings and persistence
  - [x] 2.1 Implement pure settings and wire store clamping
    - Create `src/engine/settings.ts` (defaults, ranges, `clampSetting`, `clampReducedMotion`, `serializeSaved`, never-throwing `parseSaved`)
    - Make `setSettings` in `src/engine/store.ts` use the clamp functions
    - _Requirements: 7.1, 7.2, 7.3, 7.7, 7.8, 7.9, 7.10, 7.14_

  - [x] 2.2 Implement the persistence wrapper
    - Create `src/engine/persistence.ts`: read `loss-of-signal:v1` once at start, subscribe to the store and write on change, wrap every access in try/catch, tolerate `localStorage` being undefined
    - _Requirements: 7.4, 7.5, 7.6, 7.11_

  - [x]* 2.3 Write property test for setter clamping
    - **Property 13: Settings setter clamping**
    - **Validates: Requirements 7.2, 7.3**

  - [x]* 2.4 Write property test for settings round-trip
    - **Property 14: Settings round-trip**
    - **Validates: Requirements 7.12, 7.14**

  - [x]* 2.5 Write property test for parser robustness
    - **Property 15: Parser robustness**
    - **Validates: Requirements 7.7, 7.8, 7.9, 7.10, 7.13**

  - [x]* 2.6 Write unit tests for persistence
    - Throwing `getItem` and `setItem`, undefined `localStorage`, write on change
    - _Requirements: 7.5, 7.6, 7.11_

  - [x] 2.7 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add settings parsing and persistence`
    - Commit only the files from this task

- [x] 3. Input, mouse look and pointer lock
  - [x] 3.1 Implement the pure input module
    - Create `src/engine/input.ts`: `KEY_MAP`, held and pressed state, `applyKeyDown`, `applyKeyUp`, `clearAllHeld`, `endFrame`, mouse down and up gated by lock, `applyMouseLook`, `filterMouseEvent` (400 limit inclusive), `isWithinLockGuard` with injected clock, and a focus-aware wrapper that discards movement while a Focus is active
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.2 Implement the pure pause decision
    - Create `src/engine/pointerLock.ts` with `nextPaused(current, inputs)` and a one-decision-per-frame dedup helper for the Escape plus lock-loss case
    - _Requirements: 4.2, 4.3, 4.4, 4.7, 4.10, 5.1, 5.2, 5.3_

  - [x] 3.3 Wire DOM events
    - Create `src/engine/Input.tsx` (key, mouse, blur, visibility listeners, refs only, `endFrame` as a last-priority system)
    - Create `src/engine/PointerLockController.tsx` (click requests lock, swallow rejection, `wasHeld` tracking, Lock_Guard start, resume flow, debug rules, lock test helper, non-debug not playable until first lock)
    - _Requirements: 3.1, 3.2, 4.1, 4.5, 4.6, 4.8, 4.9, 5.4, 5.5, 5.6_

  - [x]* 3.4 Write property test for input state machine
    - **Property 4: Input held/pressed state machine**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

  - [x]* 3.5 Write property test for mouse-driven use
    - **Property 5: Mouse-driven use action**
    - **Validates: Requirements 2.8, 2.9, 2.10**

  - [x]* 3.6 Write property test for mouse look formula and filter
    - **Property 6: Mouse look formula and accepted-event filter**
    - **Validates: Requirements 3.3, 3.5, 3.6**

  - [x]* 3.7 Write property test for the lock guard window
    - **Property 7: Lock guard window**
    - **Validates: Requirements 3.4, 3.7**

  - [x]* 3.8 Write property test for focus suppressing mouse look
    - **Property 8: Focus suppresses mouse look**
    - **Validates: Requirements 3.8, 15.3**

  - [x]* 3.9 Write property test for split mouse movement
    - **Property 9: Confluence of split mouse movement**
    - **Validates: Requirements 3.10**

  - [x]* 3.10 Write property test for the pause decision
    - **Property 10: Pause-trigger decision**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.7, 5.1, 5.2, 5.3**

  - [x]* 3.11 Write property test for Escape dedup
    - **Property 11: Escape dedup**
    - **Validates: Requirements 4.10**

  - [x] 3.12 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add input, mouse look and pointer lock pause`
    - Commit only the files from this task

- [x] 4. Capsule collision
  - [x] 4.1 Implement capsule-vs-box resolution
    - Create `src/engine/collision.ts` with `Box`, `resolveCapsule` (up to 4 passes, least-penetration axis, slide, landing sets `onGround`, ceiling zeroes upward velocity, best-effort return, never throws)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.10_

  - [x]* 4.2 Write property test for overlap-free result
    - **Property 28: Collision resolution has no final overlap, is a no-op when already separated, and is idempotent**
    - **Validates: Requirements 12.2, 12.3, 12.7, 12.8, 12.9**

  - [x]* 4.3 Write property test for wall sliding
    - **Property 29: Sliding along a wall**
    - **Validates: Requirements 12.4**

  - [x]* 4.4 Write property test for landing and ceiling contact
    - **Property 30: Vertical landing and ceiling contact**
    - **Validates: Requirements 12.5, 12.6**

  - [x]* 4.5 Write property test for robustness
    - **Property 31: Collision never throws**
    - **Validates: Requirements 12.10**

  - [x] 4.6 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add capsule box collision`
    - Commit only the files from this task

- [x] 5. Player body and movement modes
  - [x] 5.1 Implement the player body
    - Create `src/engine/playerBody.ts`: `CAPSULE`, `eyePosition`, `setBody` (zero `vel` when only `pos` is given)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 5.2 Implement walk movement
    - Create `src/engine/movement.ts` with `stepWalk`: default 1.4 m/s, custom speed, diagonal clamp, gravity parameter, pitch clamp to +-90 degrees, `ground(x, z)` or box-top floor, no bounce on slopes, jump only when grounded and enabled, `dt = 0` returns the body unchanged, uses `resolveCapsule` for boxes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14_

  - [x] 5.3 Implement zero-g and seated movement
    - In `src/engine/movement.ts` add `stepZeroG`, `launch` and `stepSeated` (wrap-aware yaw clamp, pitch +-80 degrees, `dt = 0` no-op)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 11.1, 11.2, 11.3, 11.4, 11.6, 9.14_

  - [x] 5.4 Implement handrail usability
    - Create `src/interaction/handrail.ts` with a 2.0 m inclusive distance check
    - _Requirements: 10.8, 10.9_

  - [x]* 5.5 Write property test for eye position and body update
    - **Property 16: Eye position and partial body update**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7**

  - [x]* 5.6 Write property test for walk speed
    - **Property 17: Walk speed and diagonal clamp**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x]* 5.7 Write property test for pitch clamp
    - **Property 18: Pitch clamp invariant**
    - **Validates: Requirements 9.5**

  - [x]* 5.8 Write property test for ground following
    - **Property 19: Ground following and no bounce**
    - **Validates: Requirements 9.6, 9.7, 9.8**

  - [x]* 5.9 Write property test for jump trigger
    - **Property 20: Jump trigger**
    - **Validates: Requirements 9.9, 9.10, 9.11**

  - [x]* 5.10 Write property test for gravity
    - **Property 21: Gravity integration while airborne**
    - **Validates: Requirements 9.4, 9.13**

  - [x]* 5.11 Write property test for zero dt
    - **Property 22: Zero dt is a no-op**
    - **Validates: Requirements 9.14**

  - [x]* 5.12 Write property test for zero-g decay
    - **Property 23: Zero-g ignores directional input, decays and integrates**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x]* 5.13 Write property test for launch impulse
    - **Property 24: Launch impulse**
    - **Validates: Requirements 10.4, 10.6, 10.7**

  - [x]* 5.14 Write property test for drift distance
    - **Property 25: Launch drift distance across step sizes**
    - **Validates: Requirements 10.5, 10.10**

  - [x]* 5.15 Write property test for seated clamps
    - **Property 27: Seated clamps and fixed position**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**

  - [x]* 5.16 Write property test for handrail boundary
    - **Property 26: Handrail usability boundary**
    - **Validates: Requirements 10.8, 10.9**

  - [x] 5.17 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add player body and walk, zero-g and seated movement`
    - Commit only the files from this task

- [x] 6. Timelines, camera shots and shake
  - [x] 6.1 Implement pure timeline logic
    - Create `src/timeline/timeline.ts`: types, `dueEvents` (stable sort by `(at, index)`), `interpolateCamera` (hold at ends), `selectShot` (ignore `to <= from`, last-listed wins, next shot owns shared boundary), `shakeAmplitude` (reduced motion x0.25), fov and far reporting
    - _Requirements: 13.1, 13.4, 13.7, 13.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.12_

  - [x] 6.2 Implement the timeline player
    - Create `src/timeline/TimelinePlayer.ts`: pausable system registration, `step`, `onTick` once per step, finish at `duration` with events up to `duration`, idempotent `skip()`
    - _Requirements: 13.2, 13.3, 13.5, 13.6, 13.9, 13.10, 13.11, 13.14_

  - [x]* 6.3 Write property test for camera interpolation
    - **Property 36: Camera key interpolation**
    - **Validates: Requirements 13.7, 13.8**

  - [x]* 6.4 Write property test for shot selection
    - **Property 37: Shot selection**
    - **Validates: Requirements 14.1, 14.3, 14.4, 14.5, 14.6, 14.7, 14.10, 14.11**

  - [x]* 6.5 Write property test for fov and far
    - **Property 38: Shot fov/far application**
    - **Validates: Requirements 14.2**

  - [x]* 6.6 Write property test for shake
    - **Property 39: Shake amplitude interpolation and reduced motion**
    - **Validates: Requirements 14.8, 14.9, 14.10**

  - [x]* 6.7 Write property test for event firing
    - **Property 32: Timeline events fire exactly once, in order, regardless of step chunking**
    - **Validates: Requirements 13.3, 13.4, 13.5, 13.12, 13.13**

  - [x]* 6.8 Write property test for onTick
    - **Property 33: onTick called once per step**
    - **Validates: Requirements 13.6**

  - [x]* 6.9 Write property test for skip
    - **Property 34: Skip semantics**
    - **Validates: Requirements 13.9, 13.10, 13.11, 13.13**

  - [x]* 6.10 Write property test for pause
    - **Property 35: Timeline time does not advance while paused**
    - **Validates: Requirements 13.14**

  - [x] 6.11 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add timelines, shots and shake`
    - Commit only the files from this task

- [x] 7. Scripted look-at
  - [x] 7.1 Implement pure focus logic
    - Create `src/interaction/focus.ts`: `startFocus` (from current, possibly mid-turn, view), `stepFocus` (shortest yaw path, target re-read every step, hold keeps tracking), `clearFocus`
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.6, 15.7, 15.9, 15.11_

  - [x] 7.2 Wire Focus into the frame loop
    - Create `src/interaction/Focus.tsx`: ref-held state, pausable system writing yaw and pitch to the player body, controller object exposing `focusOn`, `clearFocus` and `focus()`, defaults of 2 s and `hold` false
    - _Requirements: 15.1, 15.3, 15.8, 15.10_

  - [x]* 7.3 Write property test for reaching the target
    - **Property 40: Focus progression reaches the target within tolerance**
    - **Validates: Requirements 15.1, 15.2, 15.11**

  - [x]* 7.4 Write property test for hold and clear
    - **Property 41: Focus hold/clear semantics**
    - **Validates: Requirements 15.4, 15.5, 15.6**

  - [x]* 7.5 Write property test for replacement
    - **Property 42: Focus replacement starts from current direction**
    - **Validates: Requirements 15.7**

  - [x]* 7.6 Write property test for shortest path
    - **Property 43: Shortest-path yaw turning**
    - **Validates: Requirements 15.9**

  - [x]* 7.7 Write property test for pause
    - **Property 44: Focus time does not advance while paused**
    - **Validates: Requirements 15.10**

  - [x] 7.8 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add scripted look-at focus`
    - Commit only the files from this task

- [x] 8. Act loader, placeholders and unload cleanup
  - [x] 8.1 Implement the act loader
    - Create `src/engine/actLoader.ts`: `Act_Module` type, `resolveCheckpoint`, `createActLoader` with Load_Token, injected `importAct`, `allowed` gating, run previous cleanups before import, error status on failed import, no effect from superseded calls, store writes on ready, promise always resolves
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 17.11, 17.13, 18.9_

  - [x] 8.2 Add placeholder acts
    - Create `src/acts/placeholders.ts`: one trivial `Act_Module` per act id, checkpoint lists `act3-farside` = `start, wp0, wp1, wp2, wp3`, `act4-moon` = `start, tasks, run`, others at least `start`
    - _Requirements: 16.4, 16.5_

  - [x] 8.3 Add registration helpers and unload reset
    - Create `src/engine/registerHelpers.ts` with system, timer and listener helpers that push their cleanup into the active registry
    - In `src/engine/actLoader.ts` add an unload hook that finishes any Timeline, clears any Focus, and resets `moveMode` to `walk` and `objective` and `target` to null
    - _Requirements: 18.5, 18.6, 18.7, 18.8_

  - [x]* 8.4 Write property test for checkpoint resolution
    - **Property 46: Checkpoint resolution**
    - **Validates: Requirements 17.4, 17.5**

  - [x]* 8.5 Write property test for load lifecycle
    - **Property 47: Act load lifecycle and store writes**
    - **Validates: Requirements 17.2, 17.3, 17.11**

  - [x]* 8.6 Write property test for overlapping loads
    - **Property 48: Overlapping loadAct calls, only the last wins**
    - **Validates: Requirements 17.7, 17.8, 17.9, 17.10, 17.12**

  - [x]* 8.7 Write property test for sequential ordering
    - **Property 52: Sequential loadAct ordering**
    - **Validates: Requirements 18.9**

  - [x]* 8.8 Write property test for unload reset
    - **Property 50: Unload resets Timeline, Focus, and store fields**
    - **Validates: Requirements 18.6, 18.7**

  - [x]* 8.9 Write property test for system count baseline
    - **Property 51: System count returns to baseline after load/play/unload**
    - **Validates: Requirements 18.8**

  - [x]* 8.10 Write unit tests for placeholders
    - Module shape, checkpoint lists, `start` first in every list
    - _Requirements: 16.4, 16.5, 17.1_

  - [x] 8.11 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add act loader, placeholder acts and unload cleanup`
    - Commit only the files from this task

- [x] 9. Sandbox act, app wiring and debug contract
  - [x] 9.1 Build the sandbox act
    - Create `src/acts/sandbox/logic.ts` (pure zero-g zone check and test-timeline singleton guard), `scene.tsx` (plain-colour grey room, boxes, ramp via Ground_Function, zero-g zone, seat, `T` key starts the 6 s test Timeline with two Shots, one shake ramp and one event) and `index.ts` (`id: 'sandbox'`)
    - Use cleanup helpers for every system and listener, add no player-facing text, expose wall position, zone and Timeline time for the debug contract
    - _Requirements: 19.1, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11, 19.12, 19.13_

  - [x] 9.2 Wire the app and extend the debug contract
    - Update `src/app/App.tsx`: mount `FrameDriver`, `Input`, `PointerLockController` once, render the loaded act's `Scene` in the Canvas with black clear colour when none, start persistence, real dynamic `import()` map for all act ids and the sandbox (own chunk), sandbox refused with status `error` and no import when no `?debug`
    - Update `src/app/debug.ts`: `store`, `loader`, `player` (`body` null before load, `set`, `launch`), `focus`, lock test helper, sandbox info; keep `version`; set `window.__los` only with `?debug`
    - Entry branches: `?debug` loads the sandbox, otherwise show the title text from `src/content/` and load nothing
    - _Requirements: 4.1, 5.5, 5.6, 19.2, 19.3, 20.1, 20.2, 20.3, 20.4, 20.5, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

  - [x]* 9.3 Write property test for the zero-g zone
    - **Property 53: Zero-g zone toggles move mode on enter/leave**
    - **Validates: Requirements 19.7**

  - [x]* 9.4 Write property test for the test timeline singleton
    - **Property 54: Sandbox test timeline is a singleton**
    - **Validates: Requirements 19.9, 19.10**

  - [x]* 9.5 Write unit tests for bootstrap and debug gating
    - `?debug` present and absent, `window.__los` shape and `version`, `player.body` null then populated, sandbox refused without `?debug`
    - _Requirements: 19.3, 20.1, 20.2, 20.3, 21.4, 21.5, 21.7_

  - [x] 9.6 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add sandbox act and wire engine into the app`
    - Commit only the files from this task

- [x] 10. End-to-end script and done-when checklist
  - [x] 10.1 Write the engine e2e script
    - Create `e2e/engine.mjs` using the smoke test's launch settings, viewport and error collection, against `process.env.GAME_URL ?? 'http://localhost:5173/?debug'`
    - Wait for Sandbox status `ready`, then with real key presses: hold KeyW 2 s and check 2 m to 3.5 m of travel with no wall crossed, walk into a wall and check it stops, teleport into the zero-g zone and `launch(dir)` and check 1.2 m to 1.8 m of drift then rest, start the test Timeline then simulate lock loss (test helper plus `pointerlockchange`) and check `store.paused` is true and Timeline time is frozen for 1 s, resume and check it advances, call `loadAct('sandbox')` twice and check one Sandbox and status `ready`
    - Save `e2e/shots/engine.png`, print `errors: none` or the list, exit 1 on any error
    - Update `package.json` so `npm run e2e` runs `smoke.mjs` then `engine.mjs`, and mention the script in `e2e/README.md`
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10, 22.11_

  - [x] 10.2 Run the full done-when checklist, then commit this task's files
    - Do not start the dev server from the agent shell. Ask the user to run `npm run dev` in a separate terminal before `npm run e2e`
    - Run `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy` and `npm run e2e`, fix any failure, and paste each command's summary line in the report
    - Confirm no dependency over 50 kB gzipped was added, no physics engine, `public/audio/` and `docs/reference/` are unchanged, and the sandbox added no text under `src/content/`
    - Commit message: `test: add engine e2e script`
    - Commit only the files from this task
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster path
- Each task references requirements for traceability and ends with exactly one commit
- Property tests validate universal properties and unit tests cover examples and wiring
- Same-file test sub-tasks are placed in different waves to avoid write conflicts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.8", "1.9", "1.10"] },
    { "id": 3, "tasks": ["1.6"] },
    { "id": 4, "tasks": ["1.7"] },
    { "id": 5, "tasks": ["1.11"] },
    { "id": 6, "tasks": ["2.1"] },
    { "id": 7, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 8, "tasks": ["2.5", "2.6"] },
    { "id": 9, "tasks": ["2.7"] },
    { "id": 10, "tasks": ["3.1", "3.2"] },
    { "id": 11, "tasks": ["3.3", "3.4", "3.10"] },
    { "id": 12, "tasks": ["3.5", "3.11"] },
    { "id": 13, "tasks": ["3.6"] },
    { "id": 14, "tasks": ["3.7"] },
    { "id": 15, "tasks": ["3.8"] },
    { "id": 16, "tasks": ["3.9"] },
    { "id": 17, "tasks": ["3.12"] },
    { "id": 18, "tasks": ["4.1"] },
    { "id": 19, "tasks": ["4.2"] },
    { "id": 20, "tasks": ["4.3"] },
    { "id": 21, "tasks": ["4.4"] },
    { "id": 22, "tasks": ["4.5"] },
    { "id": 23, "tasks": ["4.6"] },
    { "id": 24, "tasks": ["5.1"] },
    { "id": 25, "tasks": ["5.2", "5.4", "5.5"] },
    { "id": 26, "tasks": ["5.3", "5.6", "5.16"] },
    { "id": 27, "tasks": ["5.7"] },
    { "id": 28, "tasks": ["5.8"] },
    { "id": 29, "tasks": ["5.9"] },
    { "id": 30, "tasks": ["5.10"] },
    { "id": 31, "tasks": ["5.12"] },
    { "id": 32, "tasks": ["5.13"] },
    { "id": 33, "tasks": ["5.14"] },
    { "id": 34, "tasks": ["5.15"] },
    { "id": 35, "tasks": ["5.11"] },
    { "id": 36, "tasks": ["5.17"] },
    { "id": 37, "tasks": ["6.1"] },
    { "id": 38, "tasks": ["6.2", "6.3"] },
    { "id": 39, "tasks": ["6.4", "6.7"] },
    { "id": 40, "tasks": ["6.5", "6.8"] },
    { "id": 41, "tasks": ["6.6", "6.9"] },
    { "id": 42, "tasks": ["6.10"] },
    { "id": 43, "tasks": ["6.11"] },
    { "id": 44, "tasks": ["7.1"] },
    { "id": 45, "tasks": ["7.2", "7.3"] },
    { "id": 46, "tasks": ["7.4"] },
    { "id": 47, "tasks": ["7.5"] },
    { "id": 48, "tasks": ["7.6"] },
    { "id": 49, "tasks": ["7.7"] },
    { "id": 50, "tasks": ["7.8"] },
    { "id": 51, "tasks": ["8.1", "8.2"] },
    { "id": 52, "tasks": ["8.3", "8.4", "8.10"] },
    { "id": 53, "tasks": ["8.5", "8.8"] },
    { "id": 54, "tasks": ["8.6", "8.9"] },
    { "id": 55, "tasks": ["8.7"] },
    { "id": 56, "tasks": ["8.11"] },
    { "id": 57, "tasks": ["9.1"] },
    { "id": 58, "tasks": ["9.2", "9.3"] },
    { "id": 59, "tasks": ["9.4", "9.5"] },
    { "id": 60, "tasks": ["9.6"] },
    { "id": 61, "tasks": ["10.1"] },
    { "id": 62, "tasks": ["10.2"] }
  ]
}
```

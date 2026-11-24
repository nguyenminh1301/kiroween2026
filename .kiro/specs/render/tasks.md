# Implementation Plan: render

## Overview

Implementation language is TypeScript (strict), as in the design. Pure logic goes in plain `.ts` files with no Three.js or React import, and each has a `foo.test.ts` next to it. Property tests use `fast-check` with at least 100 runs and carry a comment such as `// Feature: render, Property 24: ...`.

Two small splits from the design keep every pure file free of Three.js (Requirements 8.13, 9.7, 12.5): the fog validator lives in `src/render/fogSpec.ts` and the Three.js `applyFog` and `clearFog` live in `src/render/fog.ts`; the option normalizer lives in `src/render/materialOptions.ts` and `createMaterial` lives in `src/render/materialFactory.ts`; `cacheKey` lives in `src/procgen/cacheKey.ts` and the upload and cache live in `src/procgen/textureCache.ts`. The pure mirrors of the shader steps (fringe, vignette, gamma, grain, seed) live in `src/render/ps1Math.ts`, and the pure dpr helper `dprFor` lives in `src/render/gameView.ts`.

There are 8 top-level tasks and each ends with one commit. The last sub-task of every task runs `npm run test` and `npm run lint`, then commits only that task's files with a short conventional message and no trailers (repo rules 1 and 2). Per repo rule 10, the first task's commit also includes the spec folder `.kiro/specs/render/` (requirements, design, tasks and config). If requirements, design or tasks change later, commit the spec folder again with a `docs:` message. Do not touch `public/audio/` or `docs/reference/`. This spec supersedes `engine-core` requirement 19.11, so the sandbox moves from plain colours to the material factory in task 7. Task 8 runs the full done-when checklist.

The order is: pure logic for resolution, fear and stats; pure shader, snap, fog and option maths; seeded random numbers and textures; material pipeline; low-res canvas, scaler and debug stats; PS1 effect, fog and context loss; sandbox retexture; then e2e and final checks.

## Tasks

- [ ] 1. Pure logic for resolution, view, fear and stats
  - [x] 1.1 Implement level table and Game_View sizing
    - Create `src/render/levelTable.ts` with `LEVEL_TABLE`, `DEFAULT_LEVEL` (1), `levelCount` and clamping `lookupLevel`
    - Create `src/render/gameView.ts` with `gameViewSize` (largest centred 16:9 rect, zero rect for zero, negative or non-finite input) and pure `dprFor(level, rect)` returning `internalWidth / rect.width`
    - _Requirements: 1.2, 1.3, 1.6, 1.9, 2.1, 2.2, 2.3, 2.6, 2.9_

  - [x] 1.2 Implement the adaptive decision
    - Create `src/render/adaptiveDecision.ts` with the window and threshold constants, `windowMean` (returns null when the span is not covered) and `nextLevel` (filters non-finite and negative samples, settle time, strict thresholds, one step at most)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

  - [x] 1.3 Implement the fear mapping
    - Create `src/render/fear.ts` with `clampFear` (non-finite becomes 0) and `lookParams` (formulas, reduced motion halves fringe and noise only)
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 1.4 Add `fear` to the store
    - Extend `src/engine/store.ts` with `fear` (default 0) and `setFear` (clamp to 0 to 1, keep the previous value on non-finite input)
    - _Requirements: 5.1, 5.2_

  - [x] 1.5 Implement stats smoothing
    - Create `src/render/stats.ts` with `smoothEma` and the `RenderStats` type
    - _Requirements: 14.2, 14.19_

  - [ ]* 1.6 Write unit and property test for the level table
    - Unit test for the literal four entries and `DEFAULT_LEVEL`
    - **Property 1: Level table lookup shape**
    - **Validates: Requirements 1.2, 1.9**

  - [ ]* 1.7 Write property test for Game_View fit
    - **Property 3: Game_View fits and is maximal**
    - **Validates: Requirements 2.1, 2.2, 2.6, 2.7, 2.8**

  - [ ]* 1.8 Write property test for zero-size views
    - **Property 4: Game_View degenerates safely at zero size**
    - **Validates: Requirements 2.9**

  - [ ]* 1.9 Write property test for decision range
    - **Property 5: Adaptive decision changes level by at most one step and stays in range**
    - **Validates: Requirements 3.1, 3.9, 3.11, 3.12, 3.13**

  - [ ]* 1.10 Write property test for settle time
    - **Property 6: Settle time holds the level**
    - **Validates: Requirements 3.2**

  - [ ]* 1.11 Write property test for the step-down rule
    - **Property 7: Step-down rule**
    - **Validates: Requirements 3.3, 3.4, 3.7**

  - [ ]* 1.12 Write property test for the step-up rule
    - **Property 8: Step-up rule**
    - **Validates: Requirements 3.5, 3.6, 3.8**

  - [ ]* 1.13 Write property test for threshold boundaries
    - **Property 9: Threshold boundary is inclusive of "no change"**
    - **Validates: Requirements 3.10**

  - [x]* 1.14 Write simulation tests for the decision
    - Steady 30 ms steps down once per 3 s to level 3 and stays; steady 8 ms steps up to level 0 and stays; one 200 ms spike among 10 ms frames does not step down; alternating one-second 30 ms and 8 ms runs change level at most once in any 3000 ms span
    - _Requirements: 3.14, 3.15, 3.16, 3.17_

  - [ ]* 1.15 Write property test for the fear setter
    - **Property 14: Fear setter clamps or preserves**
    - **Validates: Requirements 5.1, 5.2**

  - [x]* 1.16 Write property test for look params formulas
    - **Property 15: Look params formula and clamping**
    - **Validates: Requirements 5.4, 5.7, 5.8**

  - [x]* 1.17 Write property test for reduced motion
    - **Property 16: Reduced motion halves fringe and noise only**
    - **Validates: Requirements 5.5, 5.6**

  - [ ]* 1.18 Write property test for look params bounds
    - **Property 17: Look params bounds and monotonicity**
    - **Validates: Requirements 5.9, 5.10**

  - [ ]* 1.19 Write property test for stats smoothing
    - **Property 39: Stats smoothing stays within the observed range**
    - **Validates: Requirements 14.19, 14.20**

  - [x] 1.20 Run `npm run test` and `npm run lint`, then commit this task's files and the spec folder
    - Commit message: `feat: add resolution, view, fear and stats logic`
    - Include `.kiro/specs/render/` in this commit (repo rule 10)
    - Commit only the files from this task plus the spec folder

- [ ] 2. Pure shader, snap, fog and option maths
  - [x] 2.1 Implement Bayer and quantize
    - Create `src/render/bayer.ts` with `BAYER4`, `bayer4` (period 4, negative-safe, `(m + 0.5) / 16`) and `quantize` (63 levels, clamped input)
    - _Requirements: 6.8, 6.11, 6.12, 6.13, 6.14, 6.15_

  - [x] 2.2 Implement the pure shader step mirrors
    - Create `src/render/ps1Math.ts` with the fringe offset and sample positions, the vignette multiplier, `toGamma`, `toLinear`, the grain term (`noise * 0.03` bound, per-pixel hash from a seed) and `grainSeed(gameTimeSeconds)` (`floor(t * 24)`)
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.9_

  - [x] 2.3 Implement vertex snap maths
    - Create `src/render/snap.ts` with `snapStep`, `snapClip` and `snapVertex` (unchanged when `w` is not positive, `z` and `w` untouched)
    - _Requirements: 7.2, 7.3, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [x] 2.4 Implement the fog spec validator
    - Create `src/render/fogSpec.ts` with `FogSpec` and `isValidFogSpec` (finite, `0 <= near < far`)
    - _Requirements: 9.6, 9.7, 9.8, 9.9_

  - [x] 2.5 Implement the material option normalizer
    - Create `src/render/materialOptions.ts` with `MaterialOptions`, `NormalizedMaterialOptions`, `TextureName` and `normalizeMaterialOptions` (kind `lambert`, snap on, fog on, vertex colours off, seed 0, white)
    - _Requirements: 8.2, 8.4, 8.8, 8.13, 8.14_

  - [ ]* 2.6 Write property test for the Bayer matrix
    - **Property 23: Bayer matrix period, range and distinctness**
    - **Validates: Requirements 6.11, 6.12, 6.13**

  - [ ]* 2.7 Write property test for quantize
    - **Property 24: Quantize is grid-snapped and bounded**
    - **Validates: Requirements 6.8, 6.14, 6.15**

  - [ ]* 2.8 Write property test for the gamma round trip
    - **Property 20: Gamma round trip**
    - **Validates: Requirements 6.5, 6.9**

  - [ ]* 2.9 Write property test for fringing
    - **Property 18: Chromatic fringing offset formula**
    - **Validates: Requirements 6.3**

  - [ ]* 2.10 Write property test for the vignette
    - **Property 19: Vignette formula**
    - **Validates: Requirements 6.4**

  - [ ]* 2.11 Write property test for the grain bound
    - **Property 21: Grain bound**
    - **Validates: Requirements 6.6**

  - [ ]* 2.12 Write property test for the grain seed window
    - **Property 22: Grain seed is stable within a 1/24s window and changes across windows**
    - **Validates: Requirements 6.7**

  - [x]* 2.13 Write property test for vertex snap
    - **Property 25: Vertex snap is grid-aligned, idempotent and bounded, and guards non-positive w**
    - **Validates: Requirements 7.8, 7.9, 7.10, 7.11**

  - [ ]* 2.14 Write property test for the fog validator
    - **Property 30: Fog validator accept/reject boundary**
    - **Validates: Requirements 9.8, 9.9**

  - [ ]* 2.15 Write property test for the option normalizer
    - **Property 29: Option normalizer is idempotent**
    - **Validates: Requirements 8.13, 8.14**

  - [x] 2.16 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add shader, snap, fog and material option maths`
    - Commit only the files from this task

- [ ] 3. Seeded random numbers and procedural textures
  - [ ] 3.1 Implement the seeded RNG
    - Create `src/procgen/rng.ts` (32-bit seed coercion, range 0 inclusive to 1 exclusive, no `Math.random`, no DOM import)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 3.2 Implement shared texture helpers and the first three textures
    - Create `src/procgen/textures/helpers.ts` (128 px tile, RGBA buffer, wrap-around noise so tiles seam cleanly, palette picking, alpha 255)
    - Create `metalPanel.ts` (painted panel with rivets), `whitePanel.ts` (white panel with orange stripe) and `rust.ts` (blotches and grime), each a pure `drawTexture(seed)`
    - Use hex values from the palettes in `art.md` for the acts that use each texture
    - _Requirements: 11.2, 11.3, 11.4, 11.8, 11.9, 11.10, 11.11, 11.15, 11.16, 11.17, 11.19_

  - [ ] 3.3 Implement the last three textures and the dispatcher
    - Create `gratingPlate.ts`, `instrumentPanel.ts` (beige with small dials) and `regolith.ts`
    - Create `src/procgen/textures/index.ts` with `TEXTURE_NAMES`, `PixelData` and `drawTexture(name, seed)` that throws a descriptive error for an unknown name
    - _Requirements: 11.1, 11.5, 11.6, 11.7, 11.8, 11.18_

  - [ ]* 3.4 Write property test for RNG range and determinism
    - **Property 32: Seeded RNG range, determinism and seed sensitivity**
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [ ]* 3.5 Write property test for seed coercion
    - **Property 33: Seed coercion never throws**
    - **Validates: Requirements 10.6**

  - [ ]* 3.6 Write property test for texture invariants
    - **Property 34: Texture determinism and dimension invariants**
    - **Validates: Requirements 11.10, 11.11, 11.12, 11.13, 11.15, 11.16**

  - [ ]* 3.7 Write property test for seed sensitivity
    - **Property 35: Different seeds change the texture**
    - **Validates: Requirements 11.14**

  - [ ]* 3.8 Write property test for seams
    - **Property 36: Seam continuity**
    - **Validates: Requirements 11.19**

  - [ ]* 3.9 Write property test for unknown names
    - **Property 37: Unknown texture name throws**
    - **Validates: Requirements 11.18**

  - [ ]* 3.10 Write unit tests for texture content
    - Six names present, every tile is 128 by 128, texture colours come from the `art.md` palettes, six textures fit well under 2 MB
    - _Requirements: 11.1, 11.10, 11.17, 12.10_

  - [ ] 3.11 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add seeded rng and procedural textures`
    - Commit only the files from this task

- [ ] 4. Texture cache, snap patch and material factory
  - [ ] 4.1 Implement the texture cache
    - Create `src/procgen/cacheKey.ts` (pure, distinct keys for distinct pairs)
    - Create `src/procgen/textureCache.ts`: canvas upload, cache by name and seed, same object on repeat, `DataTexture` fallback when no 2D context, `disposeAllTextures()` for tests, cache kept on act unload, no image files
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9_

  - [ ] 4.2 Implement the vertex snap patch
    - Create `src/render/snapPatch.ts`: `onBeforeCompile` injection after projection using a shared `uInvRes` uniform, per-level `customProgramCacheKey`, `setResolution`, `remove`, `patchedCount`, repeat `apply` on one material is a no-op
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.11_

  - [ ] 4.3 Implement the material factory
    - Create `src/render/materialFactory.ts` with `createMaterial` (only `MeshBasicMaterial` or `MeshLambertMaterial`, vertex colours, fog, nearest filters, no mipmaps, repeat wrap, sRGB, snap patch, no shadows) and `disposeMaterial` (removes from the snap patch, then disposes)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.11, 8.12, 15.3, 15.4_

  - [ ]* 4.4 Write property test for the texture cache
    - **Property 38: Texture cache identity and key distinctness**
    - **Validates: Requirements 12.2, 12.3, 12.4, 12.5**

  - [ ]* 4.5 Write unit tests for the texture cache
    - No 2D context gives a `DataTexture` and does not throw, `disposeAllTextures()` empties the cache, cache survives a simulated act unload
    - _Requirements: 12.6, 12.7, 12.8_

  - [ ]* 4.6 Write unit tests for the snap patch
    - Injection string contains the divide, snap and multiply steps, cache key differs per level, `setResolution` updates every patched material, `remove` drops the material
    - _Requirements: 7.2, 7.4, 7.5, 7.6_

  - [ ]* 4.7 Write property test for material classes
    - **Property 26: Material factory creates exactly one of two classes**
    - **Validates: Requirements 8.1, 8.9, 8.11**

  - [ ]* 4.8 Write property test for factory wiring
    - **Property 27: Material factory option defaults and texture/fog/vertex-color wiring**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7, 8.8**

  - [ ]* 4.9 Write property test for shared textures
    - **Property 28: Two calls with the same options share cached textures but not material identity**
    - **Validates: Requirements 8.12**

  - [ ]* 4.10 Write property test for the material lifecycle
    - **Property 41: Material/snap-patch lifecycle count returns to baseline**
    - **Validates: Requirements 15.4, 15.6**

  - [ ] 4.11 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add texture cache, snap patch and material factory`
    - Commit only the files from this task

- [ ] 5. Low-res canvas, adaptive scaler and debug stats
  - [ ] 5.1 Implement the adaptive scaler runtime
    - Create `src/render/adaptiveScaler.ts`: module-scoped scaler with injected `onLevelChange` and `isPaused`, 600-sample cap, discard non-finite and over-1000 ms samples, 500 ms decision cadence, `setLevel` (integers 0 to 3 only), `setAuto` (on clears buffer and resets `msSinceChange`), registered once through `addSystem` as pausable, level kept across act loads
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 14.10, 14.11, 14.12, 15.5_

  - [ ] 5.2 Implement live render stats and the stats box
    - Create `src/render/renderStats.ts`: live getters for `frameMs` (EMA of measured frame time), `calls`, `triangles` (from `gl.info`), `internalWidth`, `internalHeight` and `level`
    - Create `src/render/StatsBox.tsx`: shown only with `?debug`, green monospace on a dark box at top left, updates at most 4 times per second, `pointerEvents: none`, text lives in this module and not in `src/content/`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.13, 14.14, 14.15, 14.16, 14.17, 14.18_

  - [ ] 5.3 Wire the render debug contract
    - Create `src/render/renderDebug.ts` with `installRenderDebug` (`setLevel`, `auto`)
    - Extend `src/app/debug.ts` inside the existing `?debug` guard with `stats` (live getters) and `render`, keeping `version` and every existing field
    - _Requirements: 14.1, 14.7, 14.8, 14.9, 14.16_

  - [ ] 5.4 Implement the game view and low-res canvas
    - Create `src/render/GameView.tsx`: letterboxed centred 16:9 view recomputed on window resize, black letterbox and black clear colour, `image-rendering: pixelated`, dpr from `dprFor` so the buffer equals the Internal_Resolution, resize on level change within one frame, Game_View resize does not change the level
    - Update `src/app/App.tsx` to mount `GameView`, the scaler (starting at level 1) and `StatsBox`, and to call `snapPatch.setResolution` on level change
    - _Requirements: 1.1, 1.3, 1.4, 1.6, 1.7, 1.8, 1.10, 2.3, 2.4, 2.5, 4.11, 13.9, 15.5_

  - [ ]* 5.5 Write property test for sample buffer and pause gating
    - **Property 10: Adaptive scaler sample buffer cap and pause gating**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 5.6 Write property test for malformed samples
    - **Property 11: Malformed samples are discarded by the scaler**
    - **Validates: Requirements 4.8**

  - [ ]* 5.7 Write property test for the auto toggle
    - **Property 12: Auto toggle gates level changes**
    - **Validates: Requirements 4.9, 4.10**

  - [ ]* 5.8 Write property test for level change bookkeeping
    - **Property 13: Level change resets scaler bookkeeping**
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 5.9 Write property test for `setLevel`
    - **Property 40: setLevel validates its input**
    - **Validates: Requirements 14.10, 14.11**

  - [ ]* 5.10 Write property test for the device pixel ratio
    - **Property 2: Device pixel ratio pins the drawing buffer to the Internal_Resolution**
    - **Validates: Requirements 1.6**

  - [ ]* 5.11 Write unit tests for stats box and debug contract
    - `window.__los.stats` and `window.__los.render` shape with `?debug`, absent without it, `version` kept, stats read live, box throttle and `pointerEvents: none`, scaler level survives an act unload, paused time does not advance the scaler timers
    - _Requirements: 4.7, 4.12, 14.1, 14.7, 14.8, 14.9, 14.15, 14.16, 14.17_

  - [ ] 5.12 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add low-res canvas, adaptive scaler and debug stats`
    - Commit only the files from this task

- [ ] 6. PS1 effect, fog and context loss
  - [ ] 6.1 Write the PS1 fragment shader
    - Create `src/render/ps1Shader.ts` with GLSL in this order: fringe, vignette, gamma, grain, Bayer quantize to 63 levels, back to linear; GLSL `bayer4` and `quantize` written to mirror `bayer.ts`; uniforms `fringe`, `vignette`, `noise`, `seed`, `invRes`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8, 6.9_

  - [ ] 6.2 Implement the PS1 effect and composer wiring
    - Create `src/render/PS1Effect.tsx`: `postprocessing` Effect whose `update()` reads `fear` and `reducedMotion` with `getState()`, calls `lookParams`, sets `seed` from `grainSeed(gameTime)` so grain freezes while paused, sets `invRes` from the current level; add one `EffectComposer` pass at the low-res buffer, no pass at CSS size
    - Wrap pass creation in try/catch: on failure log once with `console.error` and render without the effect
    - Measure frame time around the composer render and feed it to the scaler and stats; `calls` includes the effect pass
    - _Requirements: 1.5, 5.11, 6.1, 6.7, 6.10, 6.16, 6.17, 13.9, 14.3, 15.1_

  - [ ] 6.3 Implement fog apply and clear
    - Create `src/render/fog.ts` with `applyFog(scene, renderer, spec)` (linear fog and clear colour; invalid spec logs once, keeps previous fog and returns false) and `clearFog` (no fog, black clear colour)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [ ] 6.4 Handle WebGL context loss
    - Create `src/render/contextLoss.ts`: log `webglcontextlost` once, pause per-frame work, resume on `webglcontextrestored`; register listeners through the listener helper; mount it from `src/render/GameView.tsx`
    - _Requirements: 15.5, 15.7_

  - [ ]* 6.5 Write property test for rejected fog
    - **Property 31: Rejected fog spec is a no-op**
    - **Validates: Requirements 9.6**

  - [ ]* 6.6 Write unit tests for the shader source
    - Step order in the source, uniform names present, constants match `ps1Math.ts` (`0.012`, `0.55`, `2.2`, `0.03`, `63`, `24`), GLSL Bayer table equals `BAYER4`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.11_

  - [ ]* 6.7 Write unit tests for the PS1 effect
    - Uniforms follow store `fear` and `reducedMotion` on the next `update()`, seed frozen when game time is frozen, `invRes` follows level, compile failure logs once and renders without the effect
    - _Requirements: 5.11, 6.10, 6.16, 6.17, 15.1_

  - [ ]* 6.8 Write unit tests for context loss
    - Lost event logs once, restored event resumes, listeners removed on cleanup
    - _Requirements: 15.7_

  - [ ] 6.9 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: add PS1 post effect, fog and context loss handling`
    - Commit only the files from this task

- [ ] 7. Sandbox retexture
  - [ ] 7.1 Rebuild the sandbox look with the material factory
    - Update `src/acts/sandbox/scene.tsx` (and `logic.ts` only if needed): every mesh material from `createMaterial`, at least four distinct textures, `applyFog` with `{ color: '#3a3a3a', near: 6, far: 25 }`, repeated props drawn with `InstancedMesh`, at most one dynamic light, no player-facing text
    - Register one cleanup that calls `disposeMaterial` on every created material and `clearFog`; keep the texture cache
    - Keep collision boxes, ground function, zero-g zone and seat unchanged so `engine-core` checks and Properties 53 and 54 still pass
    - _Requirements: 8.10, 9.4, 9.5, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 15.3, 15.4_

  - [ ]* 7.2 Write unit tests for sandbox content
    - No raw `MeshStandardMaterial` or direct material construction in the act, at least four texture names used, fog values 6 m and 25 m, instanced repeats, static draw call and triangle estimates under 150 and 150000, texture memory under 2 MB, no text from the act
    - _Requirements: 8.10, 9.5, 12.10, 13.1, 13.2, 13.3, 13.5, 13.6, 13.7_

  - [ ]* 7.3 Write unit tests for sandbox lifecycle
    - Load, play a few steps and unload the sandbox: `systemCount`, patched material count and fog return to baseline, texture cache kept, scaler level unchanged
    - _Requirements: 4.12, 9.4, 12.6, 15.3, 15.4, 15.6_

  - [ ] 7.4 Run `npm run test` and `npm run lint`, then commit this task's files
    - Commit message: `feat: apply PS1 look to the sandbox act`
    - Commit only the files from this task

- [ ] 8. End-to-end script and done-when checklist
  - [ ] 8.1 Write the render e2e script
    - Create `e2e/render.mjs` using the smoke test's launch settings, viewport (1280x720) and error collection, against `process.env.GAME_URL ?? 'http://localhost:5173/?debug'`
    - Wait for Sandbox status `ready` through `window.__los`, no fixed waits, then call `render.setLevel(1)` and `render.auto(false)`
    - Check the canvas drawing buffer is 640x360 and its CSS size is 1280x720; screenshot and check each colour channel uses at most 70 distinct values; `setLevel(3)` and check 320x180; `render.auto(true)`; check `stats.calls` under 150 and `stats.triangles` under 150000; set `fear` to 1 in the store and save `e2e/shots/render-fear.png`, set it back to 0 and save `e2e/shots/render.png`
    - Print `errors: none` or the list, exit 1 on any error
    - Update `package.json` so `npm run e2e` runs `smoke.mjs`, then `engine.mjs`, then `render.mjs`, and mention the script in `e2e/README.md`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11_

  - [ ] 8.2 Run the full done-when checklist, then commit this task's files
    - Do not start the dev server from the agent shell. Ask the user to run `npm run dev` in a separate terminal before `npm run e2e`
    - Run `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy` and `npm run e2e`, fix any failure, and paste each command's summary line in the report
    - Confirm `smoke.mjs` and `engine.mjs` still pass, no dependency over 50 kB gzipped was added, first load is under 5 MB and `dist/` under 25 MB, `public/audio/` and `docs/reference/` are unchanged, no text was added under `src/content/`, and no commit or file contains a `Co-Authored-By` trailer or an AI model or vendor name
    - If any spec document changed during the work, commit `.kiro/specs/render/` again with a `docs:` message
    - Commit message: `test: add render e2e script`
    - Commit only the files from this task
    - _Requirements: 16.12, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster path
- Each task references requirements for traceability and ends with exactly one commit
- Property tests validate universal properties and unit tests cover examples and wiring
- Same-file sub-tasks are placed in different waves to avoid write conflicts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.6", "1.7", "1.9", "1.15", "1.16", "1.19"] },
    { "id": 2, "tasks": ["1.8", "1.10", "1.17"] },
    { "id": 3, "tasks": ["1.11", "1.18"] },
    { "id": 4, "tasks": ["1.12"] },
    { "id": 5, "tasks": ["1.13"] },
    { "id": 6, "tasks": ["1.14"] },
    { "id": 7, "tasks": ["1.20"] },
    { "id": 8, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 9, "tasks": ["2.6", "2.8", "2.13", "2.14", "2.15"] },
    { "id": 10, "tasks": ["2.7", "2.9"] },
    { "id": 11, "tasks": ["2.10"] },
    { "id": 12, "tasks": ["2.11"] },
    { "id": 13, "tasks": ["2.12"] },
    { "id": 14, "tasks": ["2.16"] },
    { "id": 15, "tasks": ["3.1"] },
    { "id": 16, "tasks": ["3.2", "3.4"] },
    { "id": 17, "tasks": ["3.3", "3.5"] },
    { "id": 18, "tasks": ["3.6", "3.10"] },
    { "id": 19, "tasks": ["3.7"] },
    { "id": 20, "tasks": ["3.8"] },
    { "id": 21, "tasks": ["3.9"] },
    { "id": 22, "tasks": ["3.11"] },
    { "id": 23, "tasks": ["4.1", "4.2"] },
    { "id": 24, "tasks": ["4.3", "4.4", "4.6"] },
    { "id": 25, "tasks": ["4.5", "4.7"] },
    { "id": 26, "tasks": ["4.8"] },
    { "id": 27, "tasks": ["4.9"] },
    { "id": 28, "tasks": ["4.10"] },
    { "id": 29, "tasks": ["4.11"] },
    { "id": 30, "tasks": ["5.1", "5.2", "5.10"] },
    { "id": 31, "tasks": ["5.3", "5.4", "5.5"] },
    { "id": 32, "tasks": ["5.6", "5.11"] },
    { "id": 33, "tasks": ["5.7"] },
    { "id": 34, "tasks": ["5.8"] },
    { "id": 35, "tasks": ["5.9"] },
    { "id": 36, "tasks": ["5.12"] },
    { "id": 37, "tasks": ["6.1", "6.3"] },
    { "id": 38, "tasks": ["6.2", "6.5", "6.6"] },
    { "id": 39, "tasks": ["6.4", "6.7"] },
    { "id": 40, "tasks": ["6.8"] },
    { "id": 41, "tasks": ["6.9"] },
    { "id": 42, "tasks": ["7.1"] },
    { "id": 43, "tasks": ["7.2", "7.3"] },
    { "id": 44, "tasks": ["7.4"] },
    { "id": 45, "tasks": ["8.1"] },
    { "id": 46, "tasks": ["8.2"] }
  ]
}
```

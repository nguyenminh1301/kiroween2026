# Design: polish

Work is grouped by area. Each visual change is compared with the named reference shot and the e2e screenshot of the same moment.

## Decisions
- The title backdrop (`src/render/TitleBackdrop.tsx`) is a scene inside the existing canvas, shown when the screen is a menu and no act is loaded. Menu screens get a translucent background so it shows through. It builds its own 20 m corridor from the act 3 palette (with a side opening at 15 m) and unmounts when an act loads, so it costs nothing during play.
- The creature silhouette in the backdrop reuses `procgen/creatureModel.ts`, black, unlit.
- Timings are pure functions in `src/render/backdropMath.ts` (drift, sway, creature cross) so they can be tested.
- Flashlight limit on near surfaces: the light uses `decay` and a lowered intensity within 2 m through a distance clamp in the shader chunk already used by act 3, set per frame from the nearest hit distance.
- Reduced motion scales shake by 0.25 where shake is applied, and fringe/grain uniforms by 0.5.
- E2E waits: a shared `e2e/lib.mjs` provides `waitState` with a default 30 s timeout. Fixed `waitForTimeout` calls are replaced by state waits, except short settle times for screenshots.
- `switch.mjs` and `idle.mjs` are new e2e scripts added to `npm run e2e`. The missing-audio run is a mode of `playthrough.mjs` (`BLOCK_AUDIO=1`) run by `npm run e2e` after the normal one.
- Perf stats are logged by `playthrough.mjs` at three points per act and checked against budgets.
- Where an item says "fix anything else that reads worse" the changes are listed in the final report.

## Decisions made during the work
- Idle hint: an app-level frame system (`src/ui/idleHint.ts`) shows a hint slip after 20 s without input while an objective is on screen, and clears it on the next input. Needed for req 3.3, since the existing hints only show once for 6 s.
- Debug contract additions (never renames): `gameTime()`, `shake()`, `look()`, `flicker()`.
- Reduced motion also scales flame and plasma flicker by 0.3 (`flickerScale`) and dims the sleep flashes with CSS.
- Pushes in the act 3 chase scripts wait for the velocity to change (bounded at 1.5 s) instead of a fixed settle. The playthrough accepts that a push near the hatch may already use it.
- Voiced lines (`act0.intro1`, `act0.intro2`, `act5.end`) are not reworded, because `public/audio/` may not change and the text must match the recording.
- Act 4 regolith and ambient light were raised after the review against `play-act4-surface.png`; the flag cloth and ground read too dark.

## E2E on SwiftShader: slow and timing-sensitive scripts
Measured in the closing run against a dev server on port 5180 (headless Chromium, SwiftShader).
- Slow: `idle.mjs` (about 6 min, it waits out real idle timers), `playthrough.mjs` (about 3 min, 4 to 5 min with `BLOCK_AUDIO=1`), `switch.mjs` (about 2.5 min), `act3.mjs`, `act4.mjs` and `act5.mjs` (about 1.5 to 2 min each).
- Timing-sensitive: `act3.mjs` chase. Its "still running, not caught" check failed once and passed on the rerun; the monster can close in when SwiftShader frames are slow.
- Fixed in this run: `playthrough.mjs` act 2 pen grab missed when drift from the last push carried the body out of reach. It now stops the body before the grab and retries once on objective state. Its act 3 impostor call was missed when a single teleport jumped over the z = -12 line with no frame in between; it now steps across in two moves with a game-time wait and waits on the `impostor-capcom` anomaly flag.

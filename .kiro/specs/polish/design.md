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

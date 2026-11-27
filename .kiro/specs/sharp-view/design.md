# Design: sharp-view

## Level indices
Table indices shift by two: 0 1920x1080, 1 1280x720, 2 960x540, 3 640x360, 4 480x270, 5 320x180. `DEFAULT_LEVEL` becomes 3 (the old default). `e2e/render.mjs` and `debug.test.ts` use the new indices.

## Decision (`adaptiveDecision.ts`, pure)
`nextLevel(level, samples, msSinceChange, opts)` with `opts = { top, floor, upBlocked, displayMs }`. Down: 3 s mean over 25 ms. Up: 5 s mean under `clamp(displayMs * 1.05, 7, 17.5)`. `displayMs` is the 10th percentile of the samples, the best estimate of the display's frame time. A 30 fps machine has a 33 ms 10th percentile, the cap of 17.5 ms keeps it from climbing.

## Ranges (`pictureRange.ts`, pure)
`pictureRange(picture, viewPx)` returns `{ start, top, floor }` as level indices.
- Sharp: fit = first level with width <= viewPx. start = max(fit, 1) clamped to floor 3. top = fit (so 0 only when the view is 1920 px or more).
- Balanced: start 2 (3 if the view is under 960), top 2, floor 3.
- Retro: start 3, top 3, floor 5.
Decision: the brief says "never below 640x360 on its own" and also "Retro is 640x360 and lower". Retro keeps 480 and 320 in its range, because the player chose it. Sharp and Balanced never go below 640.

## Scaler (`adaptiveScaler.ts`)
`configure({ picture, viewPx })` sets the range. The first call, and a change of picture, set the level to `start`. A resize only clamps, unless the scaler has not moved yet. `hold(ms)` (from `engine/renderHold.ts`) clears samples and ignores time for `ms`. Holds come from: loader state changes, `act` changes, resume from pause, camera cuts in `TimelinePlayer`. Paused time never reaches `step`. Drop blocks climbing for 30 s.

## Render
`GameView` pushes the view size (rect width times dpr) to `configure`. `PS1Effect` takes `invRes` from the level. Snap grid and dither already work on internal pixels, so they scale with the level. The canvas stays pixelated.

## Setting
`Settings.picture: 'sharp' | 'balanced' | 'retro'`, default sharp, sanitized on load. A select in `SettingsForm`. Text in `content/menus.ts`. The scaler subscribes to the store.

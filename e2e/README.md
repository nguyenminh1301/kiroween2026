# End-to-end smoke test

The smoke test does not start a server. It opens `GAME_URL` (default `http://localhost:5173/?debug`) in headless Chromium, waits for `window.__los`, checks for a canvas and WebGL2, and saves `e2e/shots/smoke.png`.

1. In one terminal, start the dev server:

   ```
   npm run dev -- --port 5173 --strictPort
   ```

2. In another terminal, run the test:

   ```
   CHROMIUM_PATH=$HOME/.cache/ms-playwright/chromium-1148/chrome-linux/chrome npm run e2e
   ```

It prints `errors: none` and exits 0 on success. Any page error or console error is listed and exits 1. Playwright is pinned to 1.49.1 to match Chromium build 1148.

## Engine test

`e2e/engine.mjs` plays the sandbox with real key presses and checks walking distance, wall stop, zero-g drift, pause on lock loss, resume, and double `loadAct`. It saves `e2e/shots/engine.png`. `npm run e2e` runs the smoke test, then the engine test.

## Render test

`e2e/render.mjs` loads the sandbox and checks the 640x360 buffer at 1280x720 CSS size, at most 70 distinct values per colour channel, the 320x180 buffer at level 3, draw calls and triangles under budget. It saves `e2e/shots/render-fear.png` (fear 1) and `e2e/shots/render.png` (fear 0). `npm run e2e` runs it after the engine test.

## Audio test

`e2e/audio.mjs` clicks the canvas to unlock audio and waits for 40 decoded names. It presses 1 for the radio line, checks the queue and the subtitle, pauses with Escape and checks the line is still showing 4 s later, then resumes. A second page blocks every `/audio/` request, presses 1 to 4 and checks there are no page errors and the subtitle still shows. `npm run e2e` runs it last.

## UI test

`e2e/ui.mjs` takes the origin from `GAME_URL`. Without `?debug` it clicks Continue and Click to start, checks the title, the six chapter buttons, and that a volume of 0.5 survives a reload. With `?debug` it checks Start, the chapter card for act 1 (and none for act 3 at `wp1`), the sandbox switch, objective and `test-box` anomaly, the pause menu and the Archive. Screenshots go to `e2e/shots/ui-*.png`. `npm run e2e` runs it last.

## Act 0 test

`e2e/act0.mjs` loads `act0-pad` and checks draw calls and triangles at the start. It waits for the wave objective, looks down over the right railing (target is WAVE), presses E, and checks the objective becomes the boarding line. It walks into the White Room with real W key presses, checks nothing was said and the view never turned, looks at Gunter (verb TALK), presses E, checks his line, aims at the hatch, presses E and waits for `act1-launch`. Screenshots go to `e2e/shots/act0-start.png`, `act0-wave.png` and `act0-room.png`. `npm run e2e` runs it last.

## Act 1 test

`e2e/act1.mjs` plays the launch and TLI by timeline time. The O2 line and the later lines never turn the view: the script checks `focus()` stays false and looks at the gauge itself to notice `o2-for-four`.

## Act 2 test

`e2e/act2.mjs` plays the three repairs with real key presses, in the order gauge, oxygen line, computer: E on the gauge and D until the needle sits in the green band; E on the tool pouch, then E three times on the joint; E on each of the three computer buttons. It then floats back (the tunnel is longer), gets in the bag and holds C: the view fades to black, no flash elements appear, and `fourth-sleeper` is marked after six seconds. It ends when act 3 loads.

## Act 4 test

`e2e/act4.mjs` loads `act4-moon` at `start` and takes shots at 3 s, 9 s and 20 s of the descent. It waits for the surface and `act4Tasks`, does the sample, the flag and the seismometer with real W and E presses, waits for the creature and the `act4Run` objective, jumps with SPACE, climbs the ladder and checks `burn-baby-burn` and the load of `act5-home`. It then loads `run`, stands still and checks it is caught and restarted at `run`. Screenshots go to `e2e/shots/act4-*.png`. `npm run e2e` runs it last.

## Act 5 and the full playthrough

`e2e/act5.mjs` loads act 5, saves `e2e/shots/act5-tNNs.png` every 9 s (compare with `docs/reference/shots/ref-act5-*.png`), checks the voiced `act5.end`, the fade and the Archive count, then quits to title mid-timeline and checks nothing is left playing.

`e2e/playthrough.mjs` runs last. It goes to the title screen, presses Start and plays every act with the act scripts' steps, saving `e2e/shots/playthrough-<act>.png`, then checks the Archive shows 6 / 6 and the title screen has the Archive button. It takes about 8 minutes on SwiftShader.

## Switch test

`e2e/switch.mjs` loads every act through the Chapters screen, pauses each one at a random moment for 3 s and checks that game time, the timeline, the subtitle, the radio queue, the creature and the player did not move, then resumes. It then loads act 3, 0, 3, 5, 1. After every load it checks that no looping sound of another act plays, that the frame system count equals the first load of that act, and that the count at the title is the same at the end as at the start. The last part checks reduced motion in the act 1 launch: shake is a quarter, fringe and grain are halved.

## Idle test

`e2e/idle.mjs` loads each act that waits for the player (acts 0 to 4, act 3 at `start`, act 4 at `tasks`), does nothing for 60 s of game time, and checks the objective and the idle hint are on screen, focus is off, the screen is not black, and the player has not moved. In act 3 the creature must still move and the phase must still be `sneak`.

## Blocked audio

`BLOCK_AUDIO=1 node e2e/playthrough.mjs` plays the whole game with every `/audio/` request aborted. Both playthrough runs print draw calls and triangles per act (first, middle and peak sample).

## Playability fixes

`e2e/walk.mjs` holds W in act 0 from 2 s of game time and checks 3 m by 6 s. `e2e/lock.mjs` starts from the title, finishes act 0 and checks the pointer lock survives the chapter card, then that Resume takes it back. `e2e/rails.mjs` looks down the act 2 tunnel and presses E four times for at least 4 m. `e2e/nowebgl.mjs` stubs WebGL away and checks the no-WebGL message shows with no uncaught error (against a dev server it ignores React's dev-only re-report of that one error).

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

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

# Tasks: environment

After each task: run `npm run test` and `npm run lint` (once they exist), then commit only that task's files. No trailers, no AI or vendor names.

- [ ] 1. Commit the existing assets
  - Stage only `public/audio/` and `docs/reference/`. Do not touch the audio files.
  - Commit: `chore: add recorded audio and reference screenshots`
  - _Requirements: 1.1, 1.2_

- [ ] 2. Scaffold the toolchain
  - Create `package.json` (scripts per requirement 3, `engines.node >=20`, exact `playwright@1.49.1`), lockfile, `.gitignore`, `tsconfig*.json`, `vite.config.ts` (react plugin, `@` alias, `build.manifest: true`, Vitest `passWithNoTests`), `eslint.config.js`, `src/vite-env.d.ts`.
  - Install all listed dependencies. Confirm `npm run test` and `npm run lint` exit 0.
  - Commit: `chore: set up vite, typescript, eslint and vitest`
  - _Requirements: 2, 3.1 to 3.5_

- [ ] 3. Build the app shell and debug contract
  - Add `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/debug.ts`, and a minimal `src/content/menus.ts` holding `LOSS OF SIGNAL`.
  - Write `src/app/debug.test.ts` covering `isDebug` (`?debug`, `?debug=1`, `?a=1&debug`, empty, `?debugger`), with a fast-check property that a string without `debug` as a key returns false.
  - Run `npm run build` once to confirm `dist/.vite/manifest.json` exists.
  - Commit: `feat: add empty app shell with debug hook`
  - _Requirements: 4, 5, 6.1_

- [ ] 4. Add the copy check
  - Write `scripts/check-copy.mjs` with exported `checkCopy(dir)` and the CLI wrapper, the fixtures under `scripts/__fixtures__/copy/`, and `scripts/check-copy.test.ts`.
  - Confirm `npm run check-copy` passes on the real `src/content/`.
  - Commit: `feat: add copy check script with tests`
  - _Requirements: 6, 3.6_

- [ ] 5. Add the budget check
  - Write `scripts/check-budget.mjs` with exported `checkBudget(distDir, limits)`, the fixtures under `scripts/__fixtures__/budget/`, and `scripts/check-budget.test.ts`.
  - Run `npm run build && npm run check-budget` and confirm it passes and prints sizes.
  - Commit: `feat: add bundle budget check with tests`
  - _Requirements: 7, 3.6_

- [ ] 6. Add the end-to-end smoke test
  - Write `e2e/smoke.mjs` and `e2e/README.md`.
  - Start `npm run dev -- --port 5173 --strictPort` in the background, run `CHROMIUM_PATH=$HOME/.cache/ms-playwright/chromium-1148/chrome-linux/chrome npm run e2e`, confirm `errors: none`, exit 0, and that `e2e/shots/smoke.png` is not tracked. Stop the dev server. View the screenshot to confirm the box and text render.
  - Commit: `test: add playwright smoke test`
  - _Requirements: 8, 3.6_

- [ ] 7. Add Kiro hooks, steering and spec
  - Create the three hooks in `.kiro/hooks/`, `.kiro/steering/repo-rules.md` (rules from design.md), and commit `.kiro/specs/environment/`.
  - Check that `.gitignore` does not list `.kiro/`.
  - Commit: `chore: add kiro hooks, steering and environment spec`
  - _Requirements: 9, 10.1 to 10.3_

- [ ] 8. Write README and CREDITS, then verify from a clean clone
  - `README.md`: one paragraph on the game, the commands, MIT line. `CREDITS.md`: copy `docs/reference/audio-credits.md` content with TODO markers unchanged, add Jost and IBM Plex Mono (OFL-1.1) rows marked as added by a later spec.
  - In a fresh `git clone` of the repo in a temp dir: run `npm ci`, `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy`. Then run `npm run e2e` against a dev server. Confirm `git log` shows one commit per task and `git log --format=%B | grep -ci 'co-authored'` is 0.
  - Commit: `docs: add readme and credits`
  - _Requirements: 10.4, 10.5, 11_

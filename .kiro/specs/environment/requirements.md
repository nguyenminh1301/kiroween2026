# Requirements: environment

## Introduction

This spec sets up the tooling and an empty app shell for LOSS OF SIGNAL, a first-person, PS1-style horror game for the desktop browser, set on the Apollo 11 flight (Kiroween 2026 entry). It adds no gameplay. Later specs build on it.

Terms: "the app" is the Vite/React app. "Budget script" is `scripts/check-budget.mjs`. "Copy script" is `scripts/check-copy.mjs`. "Smoke test" is `e2e/smoke.mjs`.

## Requirements

### 1. Existing assets

**User story:** As the developer, I want the recorded audio and reference screenshots committed untouched, so later specs can rely on them.

1. WHEN the first task runs, THE repository SHALL commit `public/audio/**`, `docs/reference/**` as they exist, with the message `chore: add recorded audio and reference screenshots`.
2. THE repository SHALL NOT modify, rename or re-encode any file under `public/audio/`.

### 2. Toolchain

**User story:** As the developer, I want a pinned, reproducible toolchain.

1. THE repository SHALL use Node 20 or newer with npm and declare `engines.node` as `>=20`.
2. THE repository SHALL depend on Vite 6, React 18, TypeScript 5.7, `@vitejs/plugin-react`, three 0.171, @react-three/fiber 8, @react-three/drei 9, postprocessing 6, zustand 5, Vitest 2, fast-check 3, ESLint 9, typescript-eslint, eslint-plugin-react-hooks and eslint-plugin-react-refresh, using those major versions.
3. THE repository SHALL pin `playwright` to exactly `1.49.1` and SHALL NOT depend on `@playwright/test`.
4. THE TypeScript config SHALL enable `strict`.
5. THE ESLint config SHALL use the flat format (`eslint.config.js`).
6. THE app SHALL resolve the alias `@` to `src` in Vite, Vitest and TypeScript.
7. THE Vitest config SHALL default to the node environment, and test files that need the DOM SHALL opt in to jsdom with a `// @vitest-environment jsdom` comment.
8. WHERE no test file exists, `npm run test` SHALL still exit 0.
9. THE `.gitignore` SHALL list `node_modules/`, `dist/`, `e2e/shots/` and `.env*`, and SHALL NOT list `.kiro/`.

### 3. npm scripts

**User story:** As the developer, I want fixed script names that later specs extend.

1. THE `package.json` SHALL define `dev`, `build`, `preview`, `test`, `lint`, `check-budget`, `check-copy` and `e2e`.
2. `dev` SHALL run `vite`, `preview` SHALL run `vite preview`, and `test` SHALL run `vitest run`.
3. `build` SHALL run `tsc -b && vite build`, and the Vite config SHALL set `build.manifest: true`.
4. `lint` SHALL run ESLint on `src` and `scripts`, then `tsc --noEmit` for the app tsconfig and the node tsconfig.
5. IF ESLint or either `tsc` run reports an error, THEN `npm run lint` SHALL exit non-zero.
6. `check-budget` SHALL run `node scripts/check-budget.mjs`, `check-copy` SHALL run `node scripts/check-copy.mjs`, and `e2e` SHALL run `node e2e/smoke.mjs`.

### 4. App shell

**User story:** As the developer, I want a minimal rendering app so the smoke test has something to check.

1. THE `index.html` SHALL set the title to `LOSS OF SIGNAL`, a black page background, and no scrollbars.
2. WHEN the page loads, THE `src/main.tsx` SHALL render `<App/>`.
3. THE App SHALL render a full-window R3F `<Canvas>` with a black clear color and one slowly rotating low-poly box.
4. THE App SHALL render a small centered text overlay reading `LOSS OF SIGNAL`.
5. THE App SHALL NOT contain any gameplay.

### 5. Debug contract

**User story:** As a later spec author, I want a stable `window.__los` hook for tests.

1. THE `src/app/debug.ts` SHALL export a pure function `isDebug(search: string): boolean`.
2. WHEN the search string contains a `debug` query parameter (with or without a value), `isDebug` SHALL return true.
3. WHEN the search string has no `debug` parameter, or is empty, `isDebug` SHALL return false.
4. WHEN the page URL has `?debug`, THE app SHALL set `window.__los = { version: '0.1.0' }` before first render completes.
5. WHEN the page URL has no `?debug`, THE app SHALL NOT define `window.__los`.
6. THE name `window.__los` SHALL NOT be renamed by any later spec.

### 6. Copy check

**User story:** As the developer, I want in-game text kept plain and short.

1. THE repository SHALL contain `src/content/menus.ts` exporting the game title `LOSS OF SIGNAL`.
2. THE copy script SHALL export a core function that takes a directory and returns a list of hits, each with file, line and reason.
3. WHEN a scanned file contains an em dash (U+2014), an en dash (U+2013) or ` -- `, THE copy script SHALL report a hit.
4. WHEN a scanned file contains one of the whole words delve, tapestry, testament, pivotal, crucial, vibrant, showcase, underscore, robust, seamless, unleash, embark, realm (case-insensitive), THE copy script SHALL report a hit.
5. WHEN a scanned file contains the phrase "whisper of" or "echoes of" (case-insensitive), THE copy script SHALL report a hit.
6. WHEN a string literal in a file named `subtitles.ts` is longer than 90 characters, THE copy script SHALL report a hit.
7. WHEN run from the command line, THE copy script SHALL scan `src/content/**`, print `file:line: reason` per hit, and exit 1 if there is any hit, else 0.
8. THE copy script SHALL match words on whole-word boundaries, so "underscored" and "realms" are not hits unless listed.
9. THE repository SHALL include Vitest tests that run the core function on fixture folders: one that passes, and one for each kind of failure.

### 7. Budget check

**User story:** As the developer, I want the build kept small enough to load fast.

1. THE budget script SHALL export a core function that takes a `dist` directory and returns sizes and failures.
2. THE budget script SHALL read `dist/.vite/manifest.json`.
3. THE budget script SHALL sum the entry chunk and its static imports, and fail if the sum is over 5 MB.
4. THE budget script SHALL fail if any dynamically imported chunk is over 4 MB.
5. THE budget script SHALL fail if `dist/` as a whole is over 25 MB.
6. THE budget script SHALL print each size it measured.
7. IF any limit is exceeded or the manifest is missing, THEN THE budget script SHALL exit 1; otherwise it SHALL exit 0.
8. THE repository SHALL include Vitest tests that run the core function on fixture `dist` folders: one under budget, and one for each limit exceeded. Fixtures SHALL use sparse or small stand-in files with sizes passed in, so no multi-megabyte files are committed.

### 8. End-to-end harness

**User story:** As the developer, I want a headless browser smoke test I can run against the dev server.

1. THE smoke test SHALL NOT start a server, and SHALL open `process.env.GAME_URL ?? 'http://localhost:5173/?debug'`.
2. THE smoke test SHALL launch Chromium headless through the `playwright` package with `executablePath: process.env.CHROMIUM_PATH || undefined` and the args `--use-gl=angle`, `--use-angle=swiftshader`, `--enable-unsafe-swiftshader`, `--ignore-gpu-blocklist`.
3. THE smoke test SHALL use a 1280x720 viewport.
4. THE smoke test SHALL collect `pageerror` events and console messages of type `error`.
5. THE smoke test SHALL wait for `window.__los`, check that a `<canvas>` exists, and check that WebGL2 is available.
6. THE smoke test SHALL save `e2e/shots/smoke.png`.
7. THE smoke test SHALL print `errors: none` or the list of errors, and SHALL exit 1 on any error and 0 otherwise.
8. THE `e2e/README.md` SHALL describe the two-terminal flow: `npm run dev -- --port 5173 --strictPort`, then `CHROMIUM_PATH=$HOME/.cache/ms-playwright/chromium-1148/chrome-linux/chrome npm run e2e`.

### 9. Kiro hooks

**User story:** As the developer, I want automatic checks while I work with Kiro.

1. WHEN a file matching `src/**/*.ts` or `src/**/*.tsx` is saved, a hook SHALL run the related Vitest tests and report failures.
2. WHEN a file under `src/content/**` is edited, a hook SHALL run `npm run check-copy` and review changed lines for plain, short, period-correct wording.
3. THE repository SHALL include a manual hook named "Budget check" that runs `npm run build && npm run check-budget`.
4. THE hooks SHALL live in `.kiro/hooks/` and be committed.

### 10. Repo rules and docs

**User story:** As the developer, I want consistent commits and short docs.

1. AFTER each task, Kiro SHALL run `npm run test` and `npm run lint`, then commit only that task's files with a short conventional commit message (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
2. THE commits, code, comments and docs SHALL NOT contain a `Co-Authored-By` trailer or any AI model or vendor name.
3. THE repo rules SHALL be recorded in `design.md` and in a steering file `.kiro/steering/repo-rules.md`.
4. THE `README.md` SHALL contain one paragraph on the game, the commands from this spec, and a line saying the repo is MIT licensed.
5. THE `CREDITS.md` SHALL start from `docs/reference/audio-credits.md`, keep its TODO markers unchanged, and add the fonts Jost and IBM Plex Mono (OFL-1.1) as to be added by a later spec.

### 11. Done criteria

1. WHEN run on a clean clone, `npm ci`, `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget` and `npm run check-copy` SHALL all exit 0.
2. WHEN the dev server is running, `npm run e2e` SHALL print `errors: none` and exit 0.
3. THE `git log` SHALL show one commit per task, with no trailers.

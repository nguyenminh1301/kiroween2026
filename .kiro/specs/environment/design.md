# Design: environment

## Layout

```
.kiro/{specs/environment, hooks, steering/repo-rules.md}
e2e/{smoke.mjs, README.md, shots/ (ignored)}
scripts/{check-budget.mjs, check-copy.mjs, *.test.ts, __fixtures__/}
src/{main.tsx, app/{App.tsx, debug.ts, debug.test.ts}, content/menus.ts, vite-env.d.ts}
index.html  vite.config.ts  vitest.config.ts (or `test` block in vite config)
tsconfig.json (references)  tsconfig.app.json  tsconfig.node.json
eslint.config.js  .gitignore  README.md  CREDITS.md  package.json
```

## Tooling decisions

- **TypeScript:** project references. `tsconfig.app.json` covers `src` (DOM libs, `strict`, `jsx: react-jsx`, `paths: {"@/*": ["src/*"]}`, `noEmit`). `tsconfig.node.json` covers `vite.config.ts`, `scripts/**/*.test.ts` and the `.mjs` scripts via `allowJs` with `checkJs` off.
- **Scripts:** `lint` is `eslint src scripts && tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json`.
- **Alias:** `resolve.alias { '@': path to src }` in Vite. Vitest reuses the Vite config.
- **Vitest:** `environment: 'node'`, `passWithNoTests: true`, `include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts']`. DOM tests add `// @vitest-environment jsdom` and install `jsdom` as a dev dependency when first needed.
- **ESLint:** flat config with `typescript-eslint` recommended, react-hooks, react-refresh (`only-export-components`). `.mjs` files get node globals. `scripts/__fixtures__/**`, `dist` and `e2e/shots` are ignored, because fixtures contain banned text on purpose.
- **Playwright:** `playwright@1.49.1` exact (no caret). Browsers are not downloaded in CI or by `npm ci` here; the machine already has Chromium build 1148, found through `CHROMIUM_PATH`.
- **Source hygiene:** scripts that look for banned characters write them as escapes (`\u2014`, `\u2013`) so the scripts do not trip themselves.

## Debug contract

`src/app/debug.ts`:

```ts
export const isDebug = (search: string): boolean =>
  new URLSearchParams(search).has('debug')

export function installDebug(win: Window = window): void  // sets win.__los = { version: '0.1.0' } when isDebug(win.location.search)
```

`main.tsx` calls `installDebug()` before `createRoot(...).render(...)`. `window.__los` gets a global type declaration in `src/vite-env.d.ts`. Later specs add fields and never rename it.

## App shell

`App.tsx`: a fixed, full-window `<Canvas>` with `gl` clear color `#000`, a `<Spin>` component using `useFrame` to rotate a `boxGeometry` with a flat `meshBasicMaterial` or low-light `meshStandardMaterial`, and an absolutely centered `<div>` with `LOSS OF SIGNAL` text (small, monospace stack, `pointer-events: none`). `index.html` sets `html, body { margin: 0; background: #000; overflow: hidden }`. The overlay text is read from `src/content/menus.ts` through `@/content/menus`.

## check-copy

`checkCopy(dir): Hit[]` walks `dir` recursively over `.ts`/`.tsx`, reads each file line by line, and returns `{ file, line, reason }`.

- Dash rule: `/\u2014|\u2013| -- /`.
- Word rule: `new RegExp('\\b(' + words.join('|') + ')\\b', 'i')`. Phrases are matched with the same boundaries.
- Length rule: only for files named `subtitles.ts`. Extract string literals with a small regex over `'...'`, `"..."` and template strings without `${`, flag any over 90 characters.

The CLI wrapper runs only when the file is the entry (`import.meta.url` compared with `process.argv[1]`), prints `file:line: reason`, and sets the exit code. Fixtures: `scripts/__fixtures__/copy/{pass,em-dash,en-dash,double-hyphen,banned-word,banned-phrase,long-subtitle}`.

## check-budget

`checkBudget(distDir, limits?): { entry, dynamic[], total, failures[] }`.

1. Parse `.vite/manifest.json`; the entry is the item with `isEntry: true`.
2. Entry size = its file plus every file reached through `imports` (static), counted once.
3. Each chunk reached only through `dynamicImports` is measured alone against 4 MB.
4. Total = sum of all file sizes under `dist/` (recursive, including the manifest).
5. Limits are 5 MB, 4 MB, 25 MB (MB = 1024 * 1024 bytes). Tests pass small limits through the `limits` argument so fixtures stay tiny, plus one test with the real defaults on a tiny passing fixture.

The CLI prints each size, then exits 1 on any failure or missing manifest.

## Smoke test

`e2e/smoke.mjs` uses `chromium` from `playwright`, the launch options given in the requirements, `page.on('pageerror')` and `page.on('console')` (type `error`), then `page.goto(url)`, `waitForFunction(() => window.__los)`, a `canvas` count check, and `canvas.getContext('webgl2')` on a fresh canvas element. It saves the screenshot, prints the result, closes the browser in `finally`, and sets `process.exitCode`.

## Hooks (`.kiro/hooks/*.kiro.hook`)

| File | Trigger | Action |
|---|---|---|
| `test-on-save.kiro.hook` | `fileEdited`, `src/**/*.ts`, `src/**/*.tsx` | askAgent: run related Vitest tests (`npx vitest run --related <file>`), report failures |
| `copy-on-content.kiro.hook` | `fileEdited`, `src/content/**` | askAgent: run `npm run check-copy`, review changed lines for plain, short, period-correct wording |
| `budget-check.kiro.hook` | `userTriggered`, name "Budget check" | askAgent: run `npm run build && npm run check-budget`, report sizes |

## Repo rules

These also go into `.kiro/steering/repo-rules.md` (always included).

1. After each task run `npm run test` and `npm run lint`, then commit only that task's files with a short conventional message (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
2. Never add a `Co-Authored-By` trailer or any AI model or vendor name to commits, code, comments or docs.
3. Never add `.kiro/` to `.gitignore`. Ignore `node_modules/`, `dist/`, `e2e/shots/`, `.env*`.
4. Do not modify, rename or re-encode files in `public/audio/`.
5. `window.__los` is the debug contract. Never rename it.
6. Copy under `src/content/` uses no dashes (em, en or ` -- `), short plain words, and passes `npm run check-copy`.

## Risks

- `vitest run` with zero tests exits 1 by default, so `passWithNoTests` is set from the first tooling task.
- SwiftShader WebGL2 can log GPU warnings as console errors in some builds. If `errors:` lists only such driver noise, filter it narrowly in `smoke.mjs` and note the filter in `e2e/README.md`; do not hide other errors.
- `tsc -b` with `noEmit` needs `composite` off and distinct `tsBuildInfoFile` paths under `node_modules/.tmp`.

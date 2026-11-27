# Design: apollo-article-site

## Pages
- `index.html` plus `src/article/article.css` and `src/article/main.ts`. Static HTML carries all text. The script only folds the menu and adds the Seen or Missed marks. It imports `parseSaved` from `src/engine/settings.ts` (no Three.js, no React).
- `play.html` holds the old root div and `src/main.tsx`.
- Vite `build.rollupOptions.input = { index, play }`. Dev server serves both.

## Saved data
- The save gains `seen: string[]` (moment ids). Persistence writes it on change and loads it at boot. `startRun` clears it, so a new run starts empty. Chapter select keeps it. The article reads the same key `loss-of-signal:v1`.

## Game flow
- Screens left: `gate`, `begin`, `game`, `leaving`. The `begin` card replaces warning, headphones and title. Click calls `audio.unlock()` then `startRun()`.
- Decision: the flicker warning screen is dropped, because the brief says the card is plain. Reduced motion stays in the Esc settings.
- Pause menu views: menu, chapters, settings. "Back to the article" unloads the act and goes to `./`.
- `wireFinish` sets screen `leaving` (CSS fade to black, 1.4 s), then goes to `./#what-really-happened`.
- Credits screen is dropped with the title menu. Fonts and assets stay in `CREDITS.md` and the article Sources.
- The title backdrop scene is removed with the title.

## Budget
- `checkBudget` reads the manifest and measures every entry on its own (static imports, scripts and styles). Game entry limit 5 MB, article entry 300 KB.

## Article facts
- Facts come from the fact sheet in the brief. Extra facts only from the pages listed in Sources. Photo captions are written from `photos.json` descriptions.
- `scripts/check-copy.mjs` also scans `index.html` text. A unit test checks `index.html` has every moment id from `src/content/archive.ts`.

## E2E
- `e2e/url.mjs` builds the game URL (`play.html` plus the search of `GAME_URL`) and the article URL from the origin of `GAME_URL`.

## Decisions made during the work
- `window.__los.loader` gains `unload()` (added, nothing renamed) so `switch.mjs` can leave an act the way "Back to the article" does.
- No WebGL is a gate reason, so `nowebgl.mjs` sees the message before any begin card.
- Two older e2e checks were fixed on the way: act 4 waits for the photo-first objective, and act 3 records the 0.3 s teeth with a DOM observer instead of a wait after two slow screenshots.
- Loading act 4 at `run` threw since the photo-first change. `finishedTasks()` in `tasks.ts` builds that state in the allowed order, with a unit test.

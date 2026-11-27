# LOSS OF SIGNAL

LOSS OF SIGNAL is a first-person horror game with a PS1 look, set on the real Apollo 11 flight in July 1969. You play Buzz Aldren, the Lunar Module Pilot, from the launch pad to splashdown, and the middle of the flight turns into a dream you have to get out of.

**Live demo:** https://kiroween2026.vercel.app

The site opens on a long article about the flight of Apollo 11, with NASA photos and sources. The button "Play as an astronaut" opens the game in a window over the article. The game also runs on its own at `play.html`. It is an entry for Kiroween 2026, Costume Contest.

## How to play

You need a desktop browser with WebGL, a mouse and a keyboard. Use headphones, because much of the game is told through sound and the radio. A run takes about 25 minutes over six chapters.

| Key | Does |
|---|---|
| Mouse | Look (click the game to lock the pointer) |
| W A S D | Move |
| E | Use |
| SPACE | Hold breath (Far side) or jump (Tranquility) |
| C | Close eyes (Coast) |
| Q | Look back |
| F | Check wrist |
| Esc | Pause menu: Resume, Restart checkpoint, Chapters, Settings, Back to the article |

The Settings page holds mouse sensitivity, volume, subtitle size, reduced motion, photo prints and Picture. Picture has three choices: Sharp (the default, the clearest view), Balanced and Retro (the lowest resolution, closest to a 1990s console). If the game runs slowly, try Balanced.

The chapters are Pad 39A, Launch, Coast, Far side, Tranquility and Splashdown. After the last one the picture fades out and the article opens at "What really happened", which lists the real moments the game showed and marks each as seen or missed.

## Run it locally

You need Node 20 or newer.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. It shows the article, and the game is at `/play.html`. Add `?debug` to the URL to get the stats box and the `window.__los` debug object.

### Tests and checks

| Command | Does |
|---|---|
| `npm test` | Vitest unit and property tests |
| `npm run lint` | ESLint on `src` and `scripts`, then `tsc --noEmit` |
| `npm run build` | Type-check and build to `dist/` |
| `npm run check-budget` | Size limits for `dist/` (run after `build`) |
| `npm run check-copy` | Rules for the player-facing text and the article text |
| `npm run e2e` | Browser tests against a running dev server |

The e2e scripts drive headless Chromium through Playwright. Start a dev server, then run the chain:

```sh
npm run dev -- --port 5180 --strictPort
GAME_URL='http://localhost:5180/?debug' npm run e2e
```

Set `CHROMIUM_PATH` if Playwright's own Chromium is not installed. Screenshots go to `e2e/shots/`. The full chain takes about 20 minutes. `e2e/README.md` says what each script checks.

## How Kiro built it

Kiro wrote the code, from specs, steering files and hooks kept in the repo. `docs/KIRO.md` tells the whole story: what each spec delivered, how each round of play notes was answered, what went wrong and how it was fixed.

- `.kiro/steering/` holds the rules Kiro always reads: product, art, tech, structure, testing, repo rules, working rules and writing rules for player text.
- `.kiro/specs/` holds one folder per spec, each with requirements, design and tasks.
- `.kiro/hooks/` holds three hooks: tests on save, a copy check on content edits, and a budget check.
- `.kiro/agents/` holds the agent used for the command line runs.

## Project layout

```
src/        game code: engine, render, audio, interaction, ui, director, acts, content
src/acts/   one folder per chapter (pad, launch, coast, far side, moon, home)
src/content all player-facing text
index.html  the article page
play.html   the game page
e2e/        browser test scripts
scripts/    budget and copy checks
docs/       KIRO.md and the article design file
public/     sound effects and photos
```

## Credits and license

The code is MIT, see `LICENSE`. Sound effects, NASA photos, the transcript source, fonts and libraries are listed in [CREDITS.md](CREDITS.md). NASA photos are public domain. The dialogue follows the Apollo 11 air to ground transcripts. The crew names in the game are changed, and the article uses the real names.

# LOSS OF SIGNAL

LOSS OF SIGNAL is a first-person horror game with a PS1 look, set on the Apollo 11 flight in July 1969. You play Buzz Aldren, the Lunar Module Pilot, from the launch pad to splashdown. A run takes about 12 minutes. It plays in a desktop browser with a mouse and keyboard. It is an entry for Kiroween 2026.

**Play:** PLAY_URL

## Controls

| Key | Does |
|---|---|
| Mouse | Look (click the game to lock the pointer) |
| W A S D | Move |
| E | Use |
| SPACE | Hold breath (Far side) or jump (Tranquility) |
| C | Close eyes (Coast) |
| Q | Look back |
| F | Check wrist |
| Esc | Pause |

Play with headphones. Much of the game is told through sound and the radio.

## Chapters

1. **Pad 39A.** Dawn on the swing arm. Wave to the crowd, then walk to the White Room and board.
2. **Launch.** Strapped in for the countdown, liftoff and staging, then the burn that leaves Earth orbit.
3. **Coast.** Zero gravity on the way to the Moon. Fix a fault in the lander, then try to sleep.
4. **Far side.** Lunar orbit, behind the Moon.
5. **Tranquility.** The landing and the surface.
6. **Splashdown.** The trip home.

After the last chapter, the Archive screen lists the details you noticed and the ones you missed.

## What is real

The crew names are changed. The flight details below come from the real mission.

- The 1202 and 1201 program alarms from the guidance computer during the landing.
- A broken circuit breaker knob in the lunar module, pushed in with a felt-tip pen.
- Light flashes the crew saw with their eyes closed, later linked to cosmic rays.
- Loss of signal behind the Moon: no radio contact with Earth for about 45 minutes on each orbit.
- The ascent engine firing down onto the descent stage, which served as the launch pad.
- The Apollo Guidance Computer routine `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE`.
- Recovery by the USS Hornet and the Sea King helicopter with the number 66.

Sources shown on the Archive screen:

- NASA Apollo 11 Flight Journal: https://www.nasa.gov/history/afj/ap11fj/index.html
- Flight Journal, launch day: https://www.nasa.gov/history/afj/ap11fj/01launch.html
- NASA technical report on the light flashes: https://ntrs.nasa.gov/citations/19740020361
- Apollo 11 AGC source, Luminary099: https://github.com/chrislgarry/Apollo-11/blob/master/Luminary099/BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc

## How to run

You need Node 20 or newer.

```sh
npm ci
npm run dev
```

Then open the URL Vite prints. Add `?debug` to the URL to get the stats box and the `window.__los` debug object.

### Checks

| Command | Does |
|---|---|
| `npm run test` | Vitest unit and property tests |
| `npm run lint` | ESLint on `src` and `scripts`, then `tsc --noEmit` |
| `npm run build` | Type-check and build to `dist/` |
| `npm run check-budget` | Check bundle sizes in `dist/` (run after `build`) |
| `npm run check-copy` | Check the player-facing text in `src/content/` |
| `npm run e2e` | Browser tests against a running dev server |

### E2E

The e2e scripts drive headless Chromium with SwiftShader through Playwright. Start a dev server, then point the scripts at it:

```sh
npm run dev -- --port 5180 --strictPort
GAME_URL='http://localhost:5180/?debug' npm run e2e
```

Set `CHROMIUM_PATH` if Playwright's own Chromium is not installed. Screenshots go to `e2e/shots/`. The full chain takes about 20 minutes. See `e2e/README.md` for what each script checks.

### Deploy

The build uses a relative base, so `dist/` works from any sub-path. `.github/workflows/pages.yml` tests, builds and deploys it to GitHub Pages on every push to `main`.

## How it was made

The game was built with Kiro. `docs/KIRO.md` describes the steering files, specs and hooks in `.kiro/`.

## License

MIT, see `LICENSE`. Sound, voice and font credits are in [CREDITS.md](CREDITS.md).

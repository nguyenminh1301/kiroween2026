# How this was built with Kiro

This file describes how Kiro built LOSS OF SIGNAL. It sticks to what the repo shows: the `.kiro/` folder and the git history.

## Who wrote what

Kiro wrote all of the code in `src/`, `scripts/` and `e2e/`. The author planned the work in phases outside Kiro and wrote one prompt per phase from that plan. For phases 1 to 5 the prompt was pasted into the Kiro IDE. From phase 6 on, it was passed to Kiro CLI.

## Steering (`.kiro/steering/`)

| File | Loaded | Governs |
|---|---|---|
| `product.md` | always | The game: cast, the six acts and their beats, the Archive, controls, anti-goals |
| `art.md` | always | The PS1 look, the colour palette of each act, period UI, how the creature may be shown |
| `tech.md` | always | Stack, frame loop rules, pause, act loading, synthesized sound fallbacks, performance and size budgets |
| `structure.md` | always | Folder layout, where text and shared types live, which folders may import which |
| `testing.md` | always | The `window.__los` debug contract, how e2e scripts work, the bug-fix rule, the checks to run before a spec is done |
| `repo-rules.md` | always | Commits after each task, no vendor names, `.gitignore`, files that must not change, credits, crew names, committing spec folders |
| `working.md` | always | No sub-agents, tasks in order, optional tasks skipped, short specs, short reports |
| `writing.md` | files in `src/content/**` | Player-facing text: no dashes, banned words, line length, radio style, sources for real facts, crew names |

`working.md` was added after the render phase and committed with the render spec (`4afde1a`). The render spec had grown to over 1,400 lines, with 43 property-test tasks, and the run used sub-agents heavily. `working.md` caps a spec at about 8 top-level tasks and 6 property tests and forbids sub-agents. The specs written after it are between 65 and 215 lines each.

## Specs (`.kiro/specs/`)

Each spec has `requirements.md` (EARS form), `design.md` and `tasks.md`. In the order they were written:

| Spec | Delivered | Tasks |
|---|---|---|
| `environment` | Vite, TypeScript, ESLint and Vitest setup, an empty app shell with the debug hook, the budget and copy check scripts, the smoke e2e | 8 |
| `engine-core` | Frame loop, input, pointer lock and pause, store, settings, movement in three modes, collision, timelines and camera shots, act loader with checkpoints, a sandbox scene | 10 top-level, 91 sub-tasks (57 optional) |
| `render` | Low-resolution rendering with adaptive steps, the post pass (fringe, vignette, grain, dither), vertex snapping, fog, materials, canvas textures, debug stats | 8 top-level, 85 sub-tasks (51 optional) |
| `audio` | Web Audio graph, loading of the recordings, a synthesized fallback for every sound, positional sound, breathing, heartbeat, tension layers, radio queue with Quindar tones | 8 |
| `interaction-ui` | Menus and screens, objective strip, dialogue box, captions, verb label, interactables and the Archive screen | 8 |
| `act0-pad` | Chapter 1 on the swing arm, plus the figure builder later acts reuse | 8 |
| `act1-launch` | Chapter 2: the cabin, countdown, liftoff, staging, the O2 reading and the TLI burn | 8 |
| `act2-coast` | Chapter 3: zero gravity, the breaker and pen, the longer tunnel, the sleep scene | 8 |
| `act3-farside` | Chapter 4: the corridor, noise meter, held breath, lockers, the hunting creature, checkpoints, the chase | 10 |
| `act4-moon` | Chapter 5: the descent with the 1202 alarm, low gravity, the three surface tasks, the run to the ladder, liftoff | 9 |
| `act5-home` | Chapter 6: re-entry, blackout, chutes, splashdown, recovery, then the Archive | 7 |
| `polish` | A live backdrop behind the menus, visual fixes against the reference shots, idle hints, reduced motion, stable e2e scripts | 9 |

## Hooks (`.kiro/hooks/`)

| Hook | When | Does |
|---|---|---|
| `test-on-save.kiro.hook` | A `.ts` or `.tsx` file under `src/` is saved | Runs `npx vitest run --related` on that file and reports failures |
| `copy-on-content.kiro.hook` | A file under `src/content/` is edited | Runs `npm run check-copy` and reviews the changed lines for plain, period wording |
| `budget-check.kiro.hook` | Run by hand | Runs `npm run build && npm run check-budget` and reports the sizes |

## How it ran

Phases 1 to 5 ran in the Kiro IDE in Spec mode. The author approved the requirements, design and tasks of each spec in the IDE before Kiro carried out the tasks. The steering files were written, and one task was run, in Vibe mode.

From phase 6 on, Kiro CLI ran headless. It used a custom agent with no sub-agent tool and with all other tools trusted. In this mode Kiro wrote the spec, committed it and carried out every task without an approval step.

After each phase the author reviewed the work in a fresh clone. The review ran the tests, lint, build, budget check, copy check and the e2e chain, and compared the e2e screenshots with the reference shots in `docs/reference/shots/`. Fixes went back to Kiro as new prompts.

## What went wrong and how it was fixed

- **Spec folders left uncommitted.** Early specs stayed out of git. Rule 10 in `repo-rules.md` now makes Kiro commit the spec folder with the first task and again whenever it changes (`d168a3e`).
- **The render spec's size and sub-agent cost.** The render spec reached over 1,400 lines and 43 property-test tasks, and the run leaned on sub-agents. `working.md` was added to keep specs short and the work in one chat.
- **CLI runs that ended early.** Two CLI runs stopped partway because a `pkill -f` pattern used to stop the dev server also matched Kiro's own process. The prompts now start the dev server with its PID saved to a file and stop it with `kill` on that PID.

## Testing

**Unit and property tests.** Vitest runs 357 tests in 77 files. 31 of those files use fast-check, with 92 property checks. The main properties:

- Movement: horizontal speed never exceeds the set speed, opposing keys cancel, pitch stays within ±90°.
- Collision: resolving leaves no overlap, leaves a free capsule unchanged, and is idempotent.
- Settings: values are clamped, valid saves round-trip, and any stored string loads without throwing.
- Timelines: keys interpolate and hold at the ends, the right shot is picked for any time, reduced motion scales camera moves.
- Act loader: an unknown checkpoint falls back to the first one, and every cleanup of the old act runs before the new act starts.
- Render maths: the Bayer matrix has period 4 and 16 distinct values, colour quantizing stays within one step, gamma round-trips, fear mapping clamps.
- Act 3 director: noise stays in 0 to 1 and falls while the player holds still, the chase gap stays within its range, tension only makes legal moves.
- Targeting and seeded random numbers: the nearest enabled item in reach is picked, and the generator is deterministic and in [0, 1).
- Act 4 tasks: the creature comes out after the third task in all six orders, and only then.

**E2E.** Plain Node scripts in `e2e/` drive headless Chromium with SwiftShader through Playwright, against a running dev server. They control the game through `window.__los` and wait on game state. `npm run e2e` chains 14 scripts: smoke, engine, render, audio, ui, one per act, act switching, idle hints, and a full playthrough that runs twice, the second time with every audio request blocked. Each act script plays its act to the next one with real key presses. The full chain takes about 20 minutes on SwiftShader.

## Assets that existed before this repo

The 40 recorded sound files and 3 narrator voice files in `public/audio/`, and the reference screenshots in `docs/reference/`, come from an earlier build of this game by the same author. They were copied in as finished files (`3113147`, see `CREDITS.md`). Everything else was made in this repo: geometry, textures, animation, UI, text and code.

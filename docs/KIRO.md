# How this was built with Kiro

This file describes how Kiro built LOSS OF SIGNAL. It sticks to what the repo shows: the `.kiro/` folder and the git history.

## Who wrote what

Kiro wrote all of the code in `src/`, `scripts/` and `e2e/`. The work was planned in phases outside Kiro, and one prompt per phase was written from that plan. For phases 1 to 5 the prompt was pasted into the Kiro IDE. From phase 6 on, it was passed to Kiro CLI in non-interactive mode.

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
| `play-fixes` | Play fixes from the full play review: scripted looks capped at 1.5 s so dialogue no longer freezes the view, pointer lock kept through chapter cards with a click to continue prompt, radio lines tagged with a beat so stale lines drop, push off from any handrail in reach, the creature stops 3.5 m away in the flashlight, an error boundary with the no-WebGL message, a quieter idle hint | Not in the repo |
| `look-fixes` | Look fixes from the same review: rounded suited figures with helmet bubble and visor, the Saturn V stack behind the White Room, cabin windows that paint their own view, flat pad ground and a narrow TLI plume, a wider act 3 flashlight with rust plates, locker view and dark slats, small carried items in act 4, a lunar module with foil panels and ladder rails, a smaller broken foam ring in act 5 | Not in the repo |
| `playtest-2-acts-0-2` | Second round of notes, acts 0 to 2 (see below) | 8 |
| `playtest-2-dream` | Second round of notes, the act 3 dream | 7 |
| `playtest-2-moon-home` | Second round of notes, acts 4 and 5 and the Archive | 9 |
| `playtest-3-acts-0-2` | Third round of notes, acts 0 to 2 (see below) | 3 |
| `playtest-3-dream` | Third round of notes, the act 3 dream | 5 |
| `playtest-3-moon-home` | Third round of notes, acts 4 and 5 | 3 |
| `apollo-article-site` | Third round of notes, the site: an article page and a game page without a title menu | 5 |

The `play-fixes` and `look-fixes` spec folders are not in the repo, so their task counts are not shown here. The table rows come from the commits.

## Hooks (`.kiro/hooks/`)

| Hook | When | Does |
|---|---|---|
| `test-on-save.kiro.hook` | A `.ts` or `.tsx` file under `src/` is saved | Runs `npx vitest run --related` on that file and reports failures |
| `copy-on-content.kiro.hook` | A file under `src/content/` is edited | Runs `npm run check-copy` and reviews the changed lines for plain, period wording |
| `budget-check.kiro.hook` | Run by hand | Runs `npm run build && npm run check-budget` and reports the sizes |

## How it ran

Phases 1 to 5 ran in the Kiro IDE in Spec mode. The author approved the requirements, design and tasks of each spec in the IDE before Kiro carried out the tasks. The steering files were written, and one task was run, in Vibe mode.

From phase 6 on, Kiro CLI ran in non-interactive mode. It used a custom agent with no sub-agent tool and with all other tools trusted. In this mode Kiro wrote the spec, committed it and carried out every task without an approval step.

Each phase was reviewed in a fresh clone. The review ran the tests, lint, build, budget check, copy check and the e2e chain, and compared the e2e screenshots with the reference shots in `docs/reference/shots/`. Fixes went back to Kiro as new prompts.

## The first round of the player's notes: three prompts

After the first full build, a player played the whole game and sent notes. Three prompts answered them, each run by Kiro CLI in non-interactive mode, one task at a time in one chat.

1. **Acts 0 to 2.** Repairs in act 2 (an oxygen line fixed with a hammer and a tap, cabin pressure with a dial, the computer, then the snapped breaker), and fixes found in play.
2. **Act 3 became a nightmare.** The far side is now Buzz's dream, played as real until he wakes in the cabin with the crew turned toward him, and picks one of two answers. The Archive records the answer.
3. **Acts 4 and 5.** Act 4 lost its creature: the horror ended with the dream, so the Moon is calm. New in act 4: a first-person ladder climb (down in 8 s, up in 5 s), the flag photo (Neil takes the real NASA picture AS11-40-5875, shown as a framed print and credited in `CREDITS.md` and the Archive), a Moon that reaches the horizon (a 200 m detailed area, rings out to 2.5 km that fall off with the Moon's curve, and an 80 m soft walking limit), and a rebuilt lander (engine bells, dish footpads and probes, an ascent stage that lifts off on its own flame while the descent stage stays as the pad, and a green AGC readout for `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE`). Act 5 now ends re-entry inside the air (no stars after the burn, deep to light blue sky, a cloud layer), with a full parachute sequence, a sharper USS Hornet, three escorts, a raft with swimmers and a Sea King 66 whose downwash ruffles the sea.

The caption of the photo uses the real astronaut's name because it quotes a NASA credit line. Game text and dialogue keep the changed crew names.

## The second round of the player's notes: three prompts

The player played again and sent a second set of notes. Three more prompts answered them, each run by Kiro CLI in non-interactive mode, one task at a time in one chat, with a short spec committed first (`playtest-2-acts-0-2`, `playtest-2-dream`, `playtest-2-moon-home`). The story rule for all three: the creature exists only in the act 3 dream, and nothing outside it hints at it or at a fourth person.

1. **Acts 0 to 2.** The breathing loop only on the Moon and in the dream, new dialogue, an opening hatch that leads into act 1, a 150 second launch with the real beats, a cabin eye at helmet height with small props, a slowly turning spacecraft, a breaker panel and a keypad in act 2, and bedtime by holding C.
2. **The dream.** A map with choices (a jammed hatch, a left and a right loop, side rooms), more hiding places, a creature that hunts the last noise it heard, the crew hanging in the cage room, a harder swallow, and a bright, normal cabin to wake in.
3. **Acts 4 and 5.** Cabin shots in the lunar module at helmet height, Neil on the surface (he climbs down first, takes the photo with a flash and a click, then scoops soil, kneels at rocks, writes on his cuff and takes photos) and Mike on the radio in orbit, the US flag, a long narrow ascent flame with thruster puffs, the next act loaded before the liftoff shot ends so the cut is a clean fade, a re-entry shake held to the launch cap, a soft sea, full-size parachutes (two 5 m drogues, three 25 m mains side by side), new dialogue in subtitles only, and an Archive rebuilt as "What really happened". The old anomaly ids went with it; the store field keeps its name because it is part of the debug contract.

## The third round of the player's notes: four prompts

A third set of notes was answered by four prompts, each run by Kiro CLI in non-interactive mode, one task at a time in one chat, with a short spec committed first.

1. **Acts 0 to 2** (`playtest-3-acts-0-2`). A dark closed box behind the act 0 hatch, a launch that spends about 10 s in the cabin with the eye and panel at the right distance, and act 2 cut to three tasks (oxygen line, gauge, computer) with an unbroken chain of handrails.
2. **The dream** (`playtest-3-dream`). No bar in the doorway and collision on every prop, a window onto the hanging crew at the first junction, the door corner hiding spot removed, a wider bag slit, a creature that fits the corridor, a 1.5 s swallow, a glowing cage door and a carry marker.
3. **Acts 4 and 5** (`playtest-3-moon-home`). The flag photo needs the player in the mark, looking at the flag, and comes first; a re-entry shot rebuilt from additive layers; reefed then open drogues and three mains in a triangle on their own lines.
4. **The site** (`apollo-article-site`). The site opens on a long article about the flight (real names, NASA photos and sources, no game code, under 300 KB of script and style). The game moved to `play.html` with no title menu: one card, "Use headphones. Click to begin.", and an Esc menu with chapters, settings and a link back to the article. The Archive became the article section "What really happened", with marks read from the saved run. The e2e scripts start from `play.html`, and a new script covers the article.

## The article redesign: one prompt

The owner found the article page too plain and had a new design made, kept in `docs/design/article-design.dc.html`. One prompt, run by Kiro CLI in non-interactive mode, turned that design file into the production page (spec `article-redesign`, four tasks). Kiro rebuilt `index.html` and `src/article/article.css` as plain static HTML and CSS with no inline styles, kept the section ids so the game still returns to `#what-really-happened`, and kept the Seen and Missed marks coming from the saved run instead of the design's fixed list. It also added a "Your flight: N of 8 moments seen" line, new fonts (Newsreader and Libre Franklin), and an article e2e that takes screenshots at 375, 768, 1280 and 1920 px. The game did not change, so only the article checks were run.

## What went wrong and how it was fixed

- **Spec folders left uncommitted.** Early specs stayed out of git. Rule 10 in `repo-rules.md` now makes Kiro commit the spec folder with the first task and again whenever it changes (`d168a3e`).
- **The render spec's size and sub-agent cost.** The render spec reached over 1,400 lines and 43 property-test tasks, and the run leaned on sub-agents. `working.md` was added to keep specs short and the work in one chat.
- **A full play review found the game playable but rough.** Dialogue froze the player, the mouse was dead after the chapter cards, dialogue lagged behind the action, the figures were crude and some windows clipped. `play-fixes` and `look-fixes` fixed these.
- **CLI runs that ended early.** Two CLI runs stopped partway because a `pkill -f` pattern used to stop the dev server also matched Kiro's own process. The prompts now start the dev server with its PID saved to a file and stop it with `kill` on that PID.

## Testing

**Unit and property tests.** Vitest runs 379 tests in 79 files. 31 of those files use fast-check, with 92 property checks. The main properties:

- Movement: horizontal speed never exceeds the set speed, opposing keys cancel, pitch stays within ±90°.
- Collision: resolving leaves no overlap, leaves a free capsule unchanged, and is idempotent.
- Settings: values are clamped, valid saves round-trip, and any stored string loads without throwing.
- Timelines: keys interpolate and hold at the ends, the right shot is picked for any time, reduced motion scales camera moves.
- Act loader: an unknown checkpoint falls back to the first one, and every cleanup of the old act runs before the new act starts.
- Render maths: the Bayer matrix has period 4 and 16 distinct values, colour quantizing stays within one step, gamma round-trips, fear mapping clamps.
- Act 3 director: noise stays in 0 to 1 and falls while the player holds still, the chase gap stays within its range, tension only makes legal moves.
- Targeting and seeded random numbers: the nearest enabled item in reach is picked, and the generator is deterministic and in [0, 1).
- Act 4 tasks: the creature comes out after the third task in all six orders, and only then.

**E2E.** Plain Node scripts in `e2e/` drive headless Chromium with SwiftShader through Playwright, against a running dev server. They control the game through `window.__los` and wait on game state. `npm run e2e` chains 18 scripts in 19 runs: smoke, engine, render, audio, ui, one per act, walking, pointer lock, rails, no WebGL, act switching, idle hints, and a full playthrough that runs twice, the second time with every audio request blocked. Each act script plays its act to the next one with real key presses. The full chain takes about 20 minutes on SwiftShader.

## Assets that existed before this repo

The 40 recorded sound files and 3 narrator voice files in `public/audio/`, and the reference screenshots in `docs/reference/`, come from an earlier build of this game by the same author. They were copied in as finished files (`3113147`, see `CREDITS.md`). Everything else was made in this repo: geometry, textures, animation, UI, text and code.

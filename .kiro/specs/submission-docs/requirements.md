# Requirements: submission-docs

Clean up credits and docs so they describe the repo as it is.

1. When the game runs, the system shall request no file under `public/audio/vo/`, and `public/audio/vo/` shall not exist.
2. The line `act0.intro1` shall show as a subtitle like every other line, and no code, asset entry or test shall depend on a `voiced` line.
3. The repo shall not contain `docs/reference/`, and `README.md`, `docs/KIRO.md`, `e2e/README.md` and the e2e scripts shall not mention it. The folders in `.kiro/specs/` stay as they are.
4. `CREDITS.md` shall list audio (one row per file: File, Freesound title, Source URL, License; "TODO" where unknown), NASA photos (number, title, link, public domain note), the dialogue source (Apollo in Real Time), fonts with licenses, and the main libraries with licenses. It shall not mention an earlier build or another project.
5. `docs/KIRO.md` shall match the repo: current test numbers, current e2e list, the missing rounds (`playtest-4-fixes` tasks 5 and 6, `real-script` task 5, `sharp-view`, `submission-docs`), no mention of an earlier build, copied files or reference shots, and "Kiro CLI in non-interactive mode" for CLI runs.
6. `README.md` shall serve a first-time judge: what the game is, the live link, how to play, how to run and test, how Kiro built it, layout, credits and license. Prose follows `.kiro/steering/writing.md`.
7. The checks `npm test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy` and the e2e scripts `smoke`, `audio`, `act0`, `article` shall pass.

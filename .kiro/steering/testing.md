---
inclusion: always
---

# Testing

## Debug contract
With `?debug` in the URL, `window.__los` exposes these fields. Later specs add them, never rename them.
- `version`
- `store`: the vanilla store. State includes `screen`, `act`, `objective`, `target`, `anomaliesSeen`.
- `loader`: `state.getState()` returns `{ status: 'idle'|'loading'|'ready'|'error', act, checkpoint }`. `loadAct(id, checkpoint?)` returns a Promise.
- `player`: `body` with `pos`, `vel`, `yaw`, `pitch`, `mode`; plus `set(partial)`.
- `stats`: `frameMs`, `calls`, `triangles`, `internalWidth`, `internalHeight`.
- `audio`: `loaded()`, `playing()`, `radioQueue()`.
- `interactables()`: returns `{ id, verb, position, enabled }[]`.
- `focus()`: true while a scripted camera move runs.
- `director` (act 3): `state`, `noise`, `threshold`, `monster` with `pos` and `mode`.

## E2E
- Plain Node `.mjs` files in `e2e/`, run against a running dev server, headless Chromium on SwiftShader.
- Drive the game through `window.__los`, not timing.
- Each script prints `errors: none` or the errors, saves screenshots to `e2e/shots/`, exits 1 on failure.
- `npm run e2e` chains them all.
- Each act spec adds a script that plays that act from its start to the next act, using real key presses for each interaction.

## Bugs
Write a test that fails because of the bug, fix it, then show the test passes.

## Before reporting a spec done
Run `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy` and `npm run e2e`. Paste the summary lines.

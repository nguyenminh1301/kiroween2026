# Design: interaction-ui

## Layout
- `src/content/`: `menus.ts`, `chapters.ts`, `hints.ts`, `anomalies.ts`, `checklists.ts`, `verbs.ts`, `hud.ts`.
- `src/engine/fx.ts`: vanilla `fxStore` (blackout, flashes, caption, card, dsky, hint, wrist) and `clearFx()`. `resetOnUnload` calls it.
- `src/interaction/`: pure `targeting.ts`, `sighting.ts`; `interactables.ts` (registry), `interactionRuntime.ts` (frame system, started once from `boot`), `Markers.tsx`.
- `src/app/`: `flow.ts` (pure screen rules), `session.ts` (start, chapters, restart, quit, finish, chapter card), `env.ts`.
- `src/ui/`: React screens and overlays plus `ui.css`. `dialogue.ts` (typewriter, name line) and `hints.ts` are pure.

## Decisions
- Store `screen` becomes the new union. `objective` is `{ text, keys?, markers? } | null`, `target` is `{ id, verb } | null`.
- The finished flag lives in the store and in the saved JSON (`finished`).
- The loader gains `unload()`, `finish()` (status `finished`) and a `beforeStart` hook. The chapter card starts in that hook, after the previous act is cleaned up and before `start()`. The card sets `paused` so game time stops, and clears it when done.
- `Act_Module.intro?: string[]`. Placeholder acts take theirs from `content/chapters.ts`.
- A card shows only when the resolved checkpoint is the first one and the load is not a restart. Restart from the pause menu passes a restart flag.
- The 25 degree cone is the angle between the view direction and the direction to the sighting, minus its angular radius.
- A hint skipped because the objective names the key is not marked as shown.
- Handrails are segments. With no interactable target, in zero-g and within 2.0 m, the target is `{ id: 'handrail', verb: 'PULL' }`.
- Start resets `anomaliesSeen`. Chapters do not.
- The sandbox light switch toggles the directional light, so the dynamic light budget holds.
- Google Fonts load from `index.html`. Fallback fonts are listed in the CSS so the game runs offline.

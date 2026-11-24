# Requirements: interaction-ui

Everything the player sees and touches apart from the 3D acts. Look: a 1969 period document (typed paper, monospace readouts, no glossy HUD).

## Glossary
- Screen: one of gate, warning, headphones, title, chapters, settings, credits, archive, game.
- Target: the interactable under the dot. Sighting: an anomaly the player can notice.

## Requirements

1. WHEN the pointer is not fine or the window is under 900 px wide, THE app SHALL show only the gate message. WHEN WebGL2 is missing, THE app SHALL show the no-WebGL message.
2. THE app SHALL flow gate, warning, headphones, title, then game, and the title SHALL link to chapters, settings, credits and archive.
3. WHEN the headphones button is pressed, THE app SHALL call `audio.unlock()`.
4. THE title SHALL show Start, Chapters, Settings, Archive (only after act 5 was finished once, saved) and Credits.
5. WHEN Start is pressed, THE app SHALL load `act0-pad`. WHEN a chapter is picked, THE app SHALL load that act at its first checkpoint.
6. THE settings screen SHALL edit sensitivity, volume, subtitle size and reduced motion through the store, which persists them.
7. WHEN Esc pauses the game, THE app SHALL show Resume, Restart checkpoint, Settings and Quit to title. Resume SHALL re-take the pointer lock.
8. WHILE the loader status is loading, THE game screen SHALL show a Loading line.
9. WHEN an act is loaded at its first checkpoint (not a restart) and has an intro, THE app SHALL show a chapter card on black for `max(4000, 1500 + 45 * characters)` ms. Game time SHALL NOT run during the card.
10. WHEN act 5 ends, THE loader SHALL report finished, THE app SHALL save the finished flag and show the Archive.
11. WHEN `?debug` is in the URL, THE game SHALL go straight to the sandbox and `window.__los.ui.go(screen)` SHALL jump to any screen.
12. THE game SHALL show a center dot, with a key cap and verb when a target exists, and a ring for handrails.
13. THE dialogue box SHALL read the store `subtitle`, type text at 45 characters a second and reserve the untyped rest.
14. THE objective strip SHALL read the store `objective` and drop in when it changes.
15. WHEN `showHint(id)` is called, THE app SHALL show the hint once per id per session, and not when the objective names the same key.
16. WHILE F is held, THE app SHALL show the wrist readout.
17. THE fx store SHALL drive blackout, flashes, caption, card and DSKY layers, and `clearFx()` SHALL reset it on act unload.
18. EACH frame, THE app SHALL pick the nearest enabled interactable hit by the view ray within reach. WHEN E or a locked click is pressed, and no Focus runs and the game is not paused, THE app SHALL call its `use()`.
19. THE objective MAY list marker ids, and those targets SHALL show a pulsing marker visible through walls.
20. WHEN in zero-g and E is pressed within 2.0 m of a handrail, THE app SHALL push off in the view direction, play `grab`, and show the push hint once.
21. WHEN an anomaly sighting has been in a 25 degree view cone and within range for 0.6 s in total, THE app SHALL add its id to `anomaliesSeen` once.
22. THE archive SHALL list the six anomalies as noticed or missed, with the real fact and a source link.
23. THE sandbox SHALL gain a switch, a handrail, a test anomaly, an objective, and keys 6, 7, 8 for fx.
24. `window.__los` SHALL gain `interactables()` and `ui`.

## Required tests
Target picking (property), sighting accumulation, chapter card duration and restart, typewriter, hint once and key rule, screen flow, check-copy.

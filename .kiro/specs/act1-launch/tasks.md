# Implementation Plan: act1-launch

Eight tasks. Each ends with `npm run test`, `npm run lint` and one commit. The first commit includes this folder. Only the required tests are written, plus the texture-count update.

- [x] 1. Content, DSKY logic, stage machine, launch and TLI timeline data. Tests: DSKY presses, stages, events and shot windows (req 4, 5, 6, 7.1).
- [x] 2. Textures `cabinPanel` and `earthCloud`, cabin shell, couches, windows, crew figures (req 1.1, 1.6, 1.7).
- [x] 3. Console panels, DSKY texture, dials, lamps, switch, O2 gauge (req 1.2 to 1.5).
- [x] 4. Outside sets: pad with smoke, space with staging, TLI view (req 2).
- [x] 5. Scene assembly and per-frame updates (sky, engine, alarm, views) (req 1.5, 1.6, 2.5).
- [x] 6. Runtime wiring: start, interactables, sighting, launch and TLI timelines, hand-off (req 3, 4, 5, 6).
- [ ] 7. `e2e/act1.mjs` and the `npm run e2e` chain.
- [ ] 8. Budget check against the reference shots and the six checks (req 7.2).

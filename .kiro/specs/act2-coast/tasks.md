# Implementation Plan: act2-coast

Eight tasks. Each ends with `npm run test`, `npm run lint` and one commit. The first commit includes this folder. Only the required tests are written.

- [x] 1. Content (subtitles, checklists) and the phase machine. Test: phases and enabled interactables (req 3, 5).
- [x] 2. Layout: `cmFar`, rails, collision boxes. Tests: layout values and the tunnel capsule property test (req 1.5 to 1.7).
- [x] 3. Sleep timer and the silhouette flag. Test: fake clock timer (req 4).
- [x] 4. Shell: lander, tunnel, hatch rings and CM room, rebuilt on growth (req 1.1, 1.2, 1.5).
- [x] 5. Props: figures, bags, pen, rails, windows, instrument panel, held pen (req 1.3, 1.4, 1.7).
- [x] 6. Runtime wiring: start, beats, interactables, sleep and hand-off (req 2, 3, 4).
- [ ] 7. `e2e/act2.mjs` and the `npm run e2e` chain (req 5.3).
- [ ] 8. Shot comparison against the reference and the six checks.

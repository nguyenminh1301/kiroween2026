# Implementation Plan: act0-pad

Eight tasks. Each ends with `npm run test`, `npm run lint` and one conventional commit. The first commit includes this folder. Only the tests under "Required tests" in the brief are written, plus the one texture count update.

- [x] 1. Figure builder, poses and head anchors (req 1.1 to 1.4). Test: under 800 triangles and head anchor at about 1.7 m.
- [x] 2. Sky dome, sun disc and new textures (req 1.5, 1.7).
- [x] 3. Act hand-off `completeAct()` and the `aim` hook on interactables (req 1.6, 4.3).
- [ ] 4. Act 0 content, layout data, crowd logic, beat machine. Tests: crowd aim rule, beat order on a fake clock (req 4, 5).
- [ ] 5. Scene: walkway, White Room, Saturn V, ground, sky, lights, boot prints (req 2.1 to 2.4, 2.8).
- [ ] 6. Crowd (one instanced call) and pad crew figures (req 2.5 to 2.7).
- [ ] 7. Runtime wiring: start, collision, ambience, cheers, interactables, sighting, hand-off (req 2.9, 3, 4).
- [ ] 8. `e2e/act0.mjs`, budget check, all six checks (req 2.10).

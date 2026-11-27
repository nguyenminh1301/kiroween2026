# Design notes

- Task 1: the bar is the rib that `buildRibs` puts at every wall edge end. The closing edge at the doorway has an end at x = 0. Ribs skip that edge. A new `walkThroughProps()` test lists solid props (lockers, hatch, cage bars, caged crew) and checks each has a collision box.
- Task 2: the wall at z = -5.6, x -3.45 to -2.55, gets a hole. Behind it lies a lit room in solid map space (columns 6 to 8, rows 8 to 10). The room is a visual set: Neil and Mike are real figures hung there, so the geometric line to the cage room is not literal. The window is in `layout.ts` as `WINDOW`, the room in `window.tsx`.
- Task 3: `corner` spots, `CORNERS`, `buildDoorLeaves`, the `corner` hide kind and its ambient case are removed. The slit becomes a CSS mask: a transparent ellipse-ish band 20 vh high and 66 vw wide with blurred edges, fabric weave around it.
- Task 4: `CREATURE_SCALE` is derived from the corridor height in a pure `creatureFit.ts`. It measures the posed bounding box over the walk cycle. The swallow timeline gets new constants (appear 0.4, open 0.5, bite 0.3, total 1.2 s of action plus the 0.3 s lead-in, 1.5 s all in) in `lunge.ts`; the bite is drawn by two CSS teeth rows in the overlay driven from `fxStore.bite`.
- Task 5: the cage handle is a small unlit mesh whose glow follows the distance to the door. The carry marker is a world marker with fog off and constant screen size.
- Decision: the checklist hint for hiding drops "behind an open door".

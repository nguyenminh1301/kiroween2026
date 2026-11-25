# Design: act4-moon

## Layers
- Pure (no Three.js or React) in `src/acts/act4-moon/`: `terrain.ts` (height field, `groundAt`, pits, sites), `layout.ts` (lander boxes, positions, checkpoints), `tasks.ts` (carry and task rules, objective), `creature.ts` (emerge and chase state machine), `descent.ts` and `liftoff.ts` (timeline data, events, formulas).
- Scene: `scene.tsx`, `moonScene.tsx` (terrain, rocks, stars, Earth, sun), `lander.tsx` (module, plume, dust, flag, props), `creatureView.tsx`.
- Wiring: `runtime.ts`, `state.ts` (mutable per-frame state), `index.ts`.
- The creature model moves to `src/procgen/creatureModel.ts` and the colored geometry helpers to `src/procgen/coloredGeo.ts`, so act 3 and act 4 share them (acts never import each other). `act3-farside/geo.ts` re-exports the helpers.
- Text: `content/subtitles.ts` (lines), `checklists.ts` (strips and task phrases), `hud.ts` (caption).

## Decisions
- Lander layout: legs on the four axes, front leg (+z) carries the ladder. Descent stage y 0.8 to 3.0, ascent stage on top (3.0 to 5.1). Collision: stage box and four footpad boxes.
- The creature's pit is the one behind the last task: flag (-3, 18), sample (17.5, 8.5), seismometer (-15.5, -9.7). The `run` checkpoint assumes the seismometer was last.
- `groundAt` is a bilinear lookup in the grid built from the analytic function, so the mesh and walking agree. The function is forced to exactly 0 around the lander (r 6, blending out to 9) and the sites (r 2, blending to 5).
- Pits are not touched by the random craters (craters are rejected near them). Rim 1.45 r.
- Descent camera shots use the lander height each frame. The seated body stays at (0, 3.3, 0) so listener audio is inside.
- The EVA starts when the descent timeline ends. The liftoff reuses the timeline class; the creature leap, ascent stage rise, fire and flag tip are driven from the same clock via `act4State`.
- Emerge starts when the last task's line finishes (or immediately if the line cannot play).
- Beep: the `alarm` effect. Sting: `sting`.
- The creature keeps its act 3 model, drawn in sunlight with a flat dark material tint so it stays a silhouette at a distance.
- Property tests (3): task orders, carry-one-item invariant under random action sequences, chase distance never grows faster than the player's retreat.

## Tests
`tasks.test.ts`, `terrain.test.ts`, `creature.test.ts`, `descent.test.ts`, `liftoff.test.ts`.

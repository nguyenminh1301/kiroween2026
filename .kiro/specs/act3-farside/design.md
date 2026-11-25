# Design: act3-farside

## Layers
- `src/director/` (pure, no Three.js or React): `noise.ts`, `hearing.ts`, `breath.ts`, `tension.ts`, `chase.ts`, `patrol.ts`, `monster.ts` (creature state machine), `snapshot.ts` (debug state holder).
- `src/acts/act3-farside/`: `layout.ts` (constants, collision, rails), `beats.ts` (pure beat flow with injected effects and a clock), `runtime.ts` (wiring), `scene.tsx`, `corridor.tsx`, `creature.tsx`, `state.ts`, `index.ts`.
- UI: `fxStore` gains `meter`, `edge` and `flash` fields. `Overlays.tsx` renders them.
- `engine/actFlow.ts` gains `restartAct()` and `setRestartHandler`, wired in boot to `restartCheckpoint()`, so an act can restart without importing `app/`.
- `interaction/interactionRuntime.ts` gains `onHandrailPush(listener)` so the noise can count pushes.

## Coordinates
z runs from the hatch (+4) to the far end (-44). Yaw 0 faces -z, yaw -pi/2 faces +x. Eye is 1.65 m above the feet, so feet at y 0.2 puts the eye at 1.85 in a 2.4 m tunnel.

## Decisions
- Chamfered cross-section: octagon points (+-1.2, +-0.6 start of chamfer) i.e. half width 1.2, half height 1.2 with 0.5 m corner cuts. Built by sweeping one profile in 1.5 m segments, merged into one geometry per material (wall, ribs, pipes, strips).
- Collision is boxes: floor, ceiling, wall slabs split around openings, lockers, bay and side room shells. Chamfer corners are collision-free (the rails and the capsule keep the player off them).
- The locker is entered by pinning the body (`seated` mode, yaw -pi/2). Hidden = in locker.
- Wall bump: detected in the logic system when the velocity along an axis drops by 0.3 m/s or more between frames while the player is not in a locker.
- Noise `speed` is the body speed in m/s.
- The monster state machine is pure: `step(dt, ctx)` returns pos, heading, mode and a list of events (`sound`, `alert`, `lost`, `caught`). The scripted walks (encounter, reveal) are monster modes `encounter` and `scripted`.
- Chase creature is placed from the gap by the runtime and has mode `crawl`. Chase time uses game dt, which the frame driver stops while paused.
- Caught flash and sting live in the runtime, the restart goes through `restartAct()`.
- The `UNKNOWN` speaker name comes from `SPEAKER_NAMES` as it is.
- Where the prompt says "act3.los": the LOS line is added to the content and shown at act start before `act3.wake`.
- E2E in a slow software renderer: scripts move the player with `player.set` when pushes would take too long, and press real keys for the rails, lockers and hatch.
- Property tests (4): noise, tension, hearing-or-breath combined into noise only, chase gap. The beat flow, patrol and breath tests are plain.

## Tests
`noise.test.ts`, `hearing.test.ts`, `tension.test.ts`, `breath.test.ts`, `chase.test.ts`, `patrol.test.ts`, `monster.test.ts`, `beats.test.ts`.

# Design: act2-coast

## Files (`src/acts/act2-coast/`)
- `phases.ts`: pure phase machine `outbound, fix, return, sleep, done`, with the pen, the breaker, the crossings and the bag as guarded transitions.
- `layout.ts`: pure. `CM_FAR_START`, `TUNNEL_GROWTH`, `railZs`, `rails`, `collisionBoxes(cmFar)`, positions of figures and props.
- `sleepTimer.ts`: pure. Closed time, flashes, breath, whispers and the final silhouette, driven by `tick(dt, closed)`. Randomness and effects are injected.
- `state.ts`: mutable scene state (`cmFar`, `penHeld`, `fixed`, `inBag`) with a change listener for the rebuild.
- `geo.ts`, `shell.tsx`, `props.tsx`, `scene.tsx`: geometry and scene. `runtime.ts`: start-up wiring. `index.ts`: act module.

## Decisions
- Collision capsule is vertical and 1.8 m tall, the tunnel is 0.9 m across. The tunnel collides only on its two side slabs (|x| >= 0.45) and a ceiling at y 2.25, so a body at x = 0 passes. The tunnel axis is y = 1.8, which matches the eye height range (1.65 to 2.1).
- Rails are a left and a right bar along the side walls (x = -1.1 and 1.1, 1 m long) at each z step, y = 1.6. Inside the tunnel the bars sit at x = +-0.4 so they stay inside the walls. Reach is 2.0 m from the eye, so a push from the tunnel centre always has a rail.
- The tunnel growth reuses the same rail z grid (`cmFar` + 2.7 - 1.5k), so a longer tunnel simply has one more rail.
- The scene rebuilds the room geometry through a small subscription on `act2State`. This runs once per act, never per frame.
- Bag SLEEP uses `seated` move mode with `seatForwardYaw` -90 degrees, which gives look-around without movement.
- The dark figure uses a new optional `figure` flag on `Flash`. The overlay draws a lit screen with a black silhouette. It only shows while the blackout is above 0.6, like the other flashes.
- Flashes clear when the eyes open.
- Breath sound position (0, 2, `cmFar` + 1.5) is read at play time so it follows the grown tunnel.
- No new textures: `whitePanel`, `metalPanel`, `instrumentPanel` and vertex colors cover the look.
- The pen is held by placing it in camera space each frame, after the camera system.
- Hand-off: `completeAct()` loads the `act3-farside` placeholder.

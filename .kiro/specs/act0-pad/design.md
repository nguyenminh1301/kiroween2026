# Design: act0-pad

## Files
- `src/procgen/figure.ts` (Three.js figure builder), `figurePose.ts` (pure pose angles), `anchors.ts` (pure head anchor registry).
- `src/procgen/skyDome.ts` (dome and sun disc meshes), new textures in `src/procgen/textures/` (`padGrating`, `paintedSteel`, `whiteRoom`, `rocketSkin`, `ground`).
- `src/engine/actFlow.ts`: `completeAct()`, `setCompleteHandler()`. Wired in `src/app/boot.ts` to `nextAct` and `loader.loadAct`, or `loader.finish()` after act 5.
- `src/acts/act0-pad/`: `room.ts` (layout and collision data), `crowdLogic.ts` (aim rule, excitement, flash and jump math), `beats.ts` (pure beat machine), `runtime.ts` (start wiring), `scene.tsx`, `crowd.tsx`, `index.ts`.

## Decisions
- Interactables get an optional `aim(eye, dir)`. `pickTarget` treats an enabled item with `aim` as hit when `aim` is true, before ray hits. This implements the WAVE rule without a special case in the runtime.
- Beats are a pure machine with injected `say(id, onDone, onStart?)`, `focusOn`, `setObjective`, `cheer`, `enter`. The runtime passes the radio and `focus`. Tests use a fake clock and a manual `say`.
- A figure faces +z locally. `pad0` is turned toward the player and the +x railing so the right arm reads as a wave.
- Crowd is a custom `ShaderMaterial` on one `InstancedMesh` of a quad. The vertex shader billboards, jumps and picks the frame from excitement and a per-instance hash. Fog is computed in the shader with the same near and far values. Flashbulbs are a bigger white quad frame chosen by hash and time.
- Hatch is enabled from the start. Boarding before the wave skips the later beats (the beat machine stops).
- Texture sizes stay 128 px. Floor grating bars are 8 px wide so a texel is at least one internal pixel at 2 m viewing distance.
- The existing texture-count test is updated to the new count. The ui e2e keeps loading the sandbox.
- Sky dome radius 900 follows nothing; it is drawn first with depth write off. The camera far plane is the default 1000.
- Ground at y = -100 is one large plane plus a sea plane beyond z < -300. Both use vertex-free flat materials with fog.

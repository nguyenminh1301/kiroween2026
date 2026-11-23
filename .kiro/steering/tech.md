---
inclusion: always
---

# Tech

- Stack: Vite, React 18, TypeScript strict, React Three Fiber, drei, postprocessing, vanilla zustand store. Vitest and fast-check for tests. No physics engine, no UI component library. Ask before adding any dependency over 50 kB gzipped.
- The game loop never goes through React state. Per-frame data lives in refs or the vanilla store, read with `getState()`. React renders only screens and overlays (menus, objective, dialogue box, captions).
- Each system has one frame callback, registered with a priority. Clamp `dt` to 0.05 s.
- Pause when the tab is hidden or pointer lock is lost. Paused time never counts toward any timer.
- Read keys with `KeyboardEvent.code`. Wrap every `localStorage` access in try/catch and fall back to defaults.
- Pure logic (collision, movement, timelines, state machines, noise, director, tone generators) lives in plain `.ts` files with no Three.js or React import, so it can be unit and property tested.
- Each act is a module loaded by dynamic import, exposing its scene, logic and checkpoints. Only one act is loaded at a time. Unloading an act stops all its sounds, timers and listeners.
- Every sound has a synthesized fallback: the game runs with no audio files.

## Budgets
- 60 fps on integrated-GPU laptops.
- Internal resolution 640x360 with nearest-filter upscale, stepping down adaptively to 480x270, then 320x180.
- Per scene: under 150 draw calls, under 150k triangles, textures 256 px max, one dynamic light at most. Use instancing for repeated props.
- First load under 5 MB, each act chunk under 4 MB, `dist/` under 25 MB.

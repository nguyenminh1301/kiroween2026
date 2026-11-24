# Design: act1-launch

## Files
- Pure: `dsky.ts` (state and presses), `stages.ts` (stage machine), `timelines.ts` (shots, shake, events, engine level, view per time). Tests beside each.
- `state.ts`: mutable per-frame state (sky, engine level, alarm, earth, view, launch time, DSKY version). Never React state.
- `cabinGeo.ts` (shell, couches, windows), `consoleGeo.ts` (panels as merged vertex-color geometry), `dskyTexture.ts` (canvas), `cabin.tsx`.
- `outside.tsx`: pad, space and TLI sets and smoke. `scene.tsx`: assembly and per-frame updates. `runtime.ts`: start wiring. `index.ts`.
- New textures `cabinPanel` and `earthCloud` in `src/procgen/textures/`. The texture-count test goes from 11 to 13.

## Decisions
- Panel spacing: 0.6 m panels 0.21 rad apart only fit edge to edge on a circle of radius 0.6/0.21 = 2.86 m. The arc uses that radius, with the middle panel centre at z = -1.17 so panel faces pass close to the three fixed spots (they are 0.0 to 0.1 m in front of the face). "1.25 m in front" is read as measured from the couch line.
- Decoration parts are built in panel-local coordinates and skipped when within a keep-clear radius of a fixed spot (converted to local space).
- The shell is a 10-sided profile (r 2.7 at y -0.8, 2.1 at 1.9, 0.5 at 2.6) so the wide console arc fits inside; side windows sit on the faces at +/-90 degrees.
- Windows are unlit quads whose color follows `state.sky` (smoothed). Stars are tiny merged quads in front of each window, opacity from sky darkness. Earth is an unlit disc in front of each window.
- Outside sets sit at x = 3000 (pad) and x = -3000 (space and TLI at z = 1200). Each is visible only while `state.view` names it. Shots set `far` large enough for them. Fog is re-applied per view.
- Smoke is one `InstancedMesh` of 600 low-poly puffs, positions computed from age on the CPU per frame while the pad is visible.
- A shot has a name, so the pure tests can ask which shot is active at a time.
- The commander and Mike use head anchors `cdr` and `cmp`. The window focus target for `act1.earth` is the right side window.
- The brief says the start pitch is 0.25 rad down, but the console centre (1.55 m) is above the eye (1.17 m), so a down pitch shows only the wall. The start pitch is +0.18 so the console fills the view.
- Fear is set to 0.05 on start and reset on unload. One hemisphere light and one point light are used in the cabin, plus a sun light for outside shots.

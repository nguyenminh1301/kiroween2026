# Design: act5-home

## Layout
- `src/procgen/cabin/`: the cabin moved from act 1 (`cabin.tsx`, `console.tsx`, geometry, DSKY, `layout.ts`) plus `cabinState.ts` (sky, earth, engine, alarm, switch, dsky). Act 1 and act 5 both import it.
- `src/acts/act5-home/`: `timeline.ts` (pure data, formulas, events), `heli.ts` (pure ease), `entry.tsx`, `ocean.tsx`, `ships.tsx`, `heli.tsx`, `state.ts`, `runtime.ts`, `scene.tsx`, `index.ts`.

## Decisions
- Cabin sky: black, Earth disc on. Earth disc is hidden at 12.3 s when the windows glow.
- Commander and Mike head positions for "view on him": (-0.65, 1.15, 0.62) and (0, 1.15, 0.62).
- Heli, Hornet and destroyer are drawn only in the ocean set. The heli hides before 46 s.
- Parachutes use a canvas checker texture built in the act (256 px max). "NAVY" and "66" come from `content/hud.ts`.
- Sky events at 17.5, 19.5 and 30.5 s change the cabin window color only.
- Capsule floats upright after splashdown, bobbing 0.6 m.

## Shots (name, view, from-to, fov)
entryClose entry 5-12 | entryFade entry 20-26 | mains ocean 31-37 fov 62 | drop ocean 37-44 | splash ocean 44-50 | ships ocean 50-57 | pull ocean 57-72.

## Formulas
- heat: 0 to 4 s, linear to 1 at 10, hold to 18, linear to 0 at 21.
- height: 900 to 31 s, then 900 * max(0, 1 - (t-31)/14)^1.3.
- drogue 21-29, mains open from 28 over 3 s, splash from 45 over 7 s, collar after 56.
- destroyer z = 330 - 6 * max(0, t-31). Heli smoothstep from carrier to hover over 46-58.

## Events
0.8 act5.entry+focus CDR | 12.3 windows #ff7a2a + reentry | 13.2 static, act5.blackout+focus CMP | 17.5 sky #ffa25a | 19.5 sky #5e8fc8 | 21 chute | 26.3 act5.radar | 28.2 chute | 29 act5.mains+focus CDR | 30.5 sky #8fb6dd | 45.1 splash + act5.splash | 50 act5.hornet | 52 horn | 62 act5.end | 69.5 fade 2 s, then completeAct at 71.5.

## E2E notes
- The playthrough waits for each anomaly instead of checking at a fixed time: on SwiftShader the burn sighting can land after 3.2 s of liftoff. All six are noticed in one run, so no act needed a fix.
- The playthrough leaves the Archive with Enter on its focused Back button, since pointer lock from Start can swallow mouse clicks.

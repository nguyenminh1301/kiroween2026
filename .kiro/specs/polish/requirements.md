# Requirements: polish

The whole game plays from title to Archive. This spec closes the visual gaps found against `docs/reference/shots/` and hardens the run for real players.

## 1. Look
1.1 While the title or a menu screen shows, the system shall render a live backdrop: about 20 m of the rust corridor with an opening on each side at the far end, one dim red lamp, black fog, a camera that drifts forward and sways in a 24 s loop, and a creature silhouette that crosses the far end for 5 s every 14 s. It shall use under 40 draw calls and stop rendering while an act runs.
1.2 The dialogue speaker name shall be about 15 px times the subtitle scale, in a brighter amber.
1.3 Act 0 shall show, from the walkway, a white and beige White Room with panel seams, stencils, a lit doorway and the round hatch on the back wall. The crowd fields shall show along the bottom edges of the start view. The pad crew shall wear white coveralls with dark patches, pockets, a belt and a soft cap.
1.4 Act 1 smoke shall be many small soft round puffs that roll out and rise. The pad shall have a flame trench and service structures. The far shot shall frame the rocket larger.
1.5 Act 2 sleepers shall be zipped to the chest, head forward, arms floating. Command module crew shall share the act 1 suit detail.
1.6 In act 3 the flashlight shall go off inside a locker, the locker slats shall be dark with gaps and the corridor visible through them, and the flashlight shall not burn near white surfaces flat.
1.7 Act 5 splashdown foam shall be a small broken ring a few metres wide plus a short splash. The last shot shall frame the Sea King close with rotor and NAVY 66 visible, with the destroyer and carrier behind. The mains shot from below shall show all three canopies.

## 2. E2E stability
2.1 Every wait in `e2e/*.mjs` shall wait on game state with a timeout of 30 s or more. `npm run e2e` shall pass twice in a row.

## 3. Run hardening
3.1 When acts are loaded in any order, `audio.playing()` shall hold only that act's sounds, the frame system count shall return to base plus the act's own, and there shall be no errors (`e2e/switch.mjs`).
3.2 When Escape is pressed in any act, timelines, radio, chase, creature and sleep timer shall stop, and Resume shall continue from the same point.
3.3 When a player does nothing for 60 s in an act that waits for input, the objective and a hint shall be on screen and nothing shall be stuck. In act 3 the creature shall keep patrolling and shall not catch a player standing still at the start (`e2e/idle.mjs`).
3.4 With every `/audio/` request blocked, the full playthrough shall finish.
3.5 With reduced motion on, camera shake shall be 25%, sleep flashes and light flicker softer, and PS1 fringe and grain halved.
3.6 Every act shall stay under 150 draw calls and 150k triangles at three points of the playthrough.

## 4. Copy
4.1 Every line in `src/content/` shall follow `.kiro/steering/writing.md` and `npm run check-copy` shall pass.

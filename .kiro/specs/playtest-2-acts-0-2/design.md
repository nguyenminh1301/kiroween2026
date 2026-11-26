# Design: playtest round 2, acts 0 to 2

Decisions
- Breathing rule is the pure function `breathAllowed(act, place)` in `src/audio/scene.ts`. `DEFAULT_SCENE.breath` is false. Acts call it when they set the scene. Level factor `BREATH_LEVEL` = 0.5.
- Dialogue is the single source in `src/content/subtitles.ts`. Removed lines leave the table. Timelines that referenced removed lines are rewritten.
- Hatch scene: a small pure timeline in act 0 (`hatchScene`) drives handle angle and hatch angle. The scene reads progress from act0State. At the end the act completes.
- Launch timeline: beats in `act1-launch/timelines.ts` stretched to 150 s. Shake uses the existing cap with per beat strength.
- Eye: act 1 and 2 seat eye at seat y + 0.7. Props are code built in `act1-launch` / `procgen/cabin`. Zero g drift is a sine on a tether, no physics.
- Earth turn: a pure `spin.ts` gives a yaw angle from game time (2 pi per 120 s). Windows and sky rotate by it.
- Act 2 mini-games: pure logic in `repairs.ts` (breaker panel, keypad). A shared helper `closeUp` releases focus on done, Esc or distance, tested in one unit test.
- Bedtime: one fade, no breaths. Act ends 4 s after black.
- Assumption: the unused `act2.comp` and `act2.compdone` lines become `act2.panel` and `act2.site` pairs as listed in the prompt.
- Decision (task 5): the player sits in the middle couch, eye 0.7 m above the cushion (`SEAT_Y` + 0.7). Neil sits left and Mike right and loop the 9 s `working` pose. Act 2 has no seat, so its start eye stays; no player body is drawn in either act. The Earth radius shrank to 0.1 so the disc fits the right window from the middle seat.
- Decision (task 6): the turn is applied to the star lookup by yaw. The Earth stays in the right window only and sways 3 degrees across it each turn, so it never leaves the frame. Act 2 lander windows slide their star planes by the same angle.

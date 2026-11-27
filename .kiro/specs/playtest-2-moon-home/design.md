# Design: playtest 2, acts 4 and 5

## Decisions
- Act 4 had no cabin view. The lunar module gets an interior (floor, six walls with two window openings, ceiling, panel with lights, props) and two cabin shots in the descent and two in the liftoff. The ascent hull is drawn front-face only, so from inside it is see-through and the window openings show the Moon.
- Standing eye in the lunar module: floor 3.0 m, eye 4.5 m. Seated eye in the command module (act 5): seat cushion plus 0.9 m. Act 1 keeps its own eye.
- The store field `anomaliesSeen` keeps its name (debug contract). Its ids change to the Archive moments: `alarm-1202`, `eagle-landed`, `flag-knocked`, `seismo-steps`, `burn-routine`, `loss-of-signal`, `escape-tower`, `hornet`.
- Moments are marked when the event plays while the player is in the act. The shots are scripted, so the player always faces them.
- Neil is a figure from `procgen/figure` with a pure path in `acts/act4-moon/neil.ts`: a list of spots with a pose and a dwell time, a walk cycle by phase, and a facing from the walk direction.
- Neil climbs down in a 5 s `neil` phase before the player's climb. The camera sits on the porch looking down the ladder.
- Order of lines: `act4.flagtask` at the start of the walk, `act4.flag` after the flag, `act4.photo` at the shutter, `act4.jobs` when the photo closes, `act4.orbit` (Mike) 8 s after that.
- Flag: stripes and stars are small coloured boxes merged in one vertex-coloured geometry. The rod stays along the top.
- Ascent flame: open cone with vertex alpha (1 at the bell, 0 at the tail), length 3 x 2.1 m. RCS puffs are a pure function `rcsFlash(cluster, t)` so they can be tested.
- Act switch after liftoff: `act4.columbia` ends at 10.5 s. The act 5 chunk is imported at 9 s (`preloadNextAct`), the fade to black starts at 12.5 s and `completeAct` runs at the end of the shot.
- Act 5 shake is clamped by the launch cap helper. Ocean ambience peaks at 0.25 after splashdown.
- Chutes: all three mains are placed at 30 m lines, 26 m apart, 25 m across. The camera pulls back with them.
- No recording exists for acts 4 and 5 except `act5.end.mp3`, which is removed as asked.

## Notes from the work
- Neil uses the suited figure from `procgen/figure` with new poses (walk, kneel, scoop, write, camera, ladder). The act 3 creature model is not used outside the dream.
- Neil walks a ping-pong route so no leg of it crosses the descent stage; a unit test checks this.
- The flash is a new white overlay (`fx.whiteout`), separate from the black fade.
- The act 1 shake noise moved to `engine/shakeNoise.ts` so act 5 uses the same cap without importing act 1.
- Two bugs found in item 9's e2e run, each with a failing check first: act 2 close-ups shut on the next frame when opened from more than 1.8 m (use reach is 2.5 m; a unit test now guards the order), and the act 3 answers ignored mouse clicks because the UI root sets `pointer-events: none` (the act 3 e2e now reports the top element).
- E2E fixes for scripts that had gone stale after earlier specs: act 2 subtitle texts and the grown tunnel end, the idle check allowing the `peek` patrol mode, the act 3 hover done with the mouse, longer waits for the slow SwiftShader page.

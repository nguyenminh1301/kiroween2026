# Design: playtest 2, the act 3 dream

## Decisions
- The map is an ASCII grid (`mapgrid.ts`, 1.2 m cells). Walls, collision, floor, strips and creature clearance all come from the same grid, so they cannot disagree.
- The creature navigates with a visibility graph (`director/patrol.ts`): nodes sit at door and corner centres, edges exist where a straight line keeps 0.35 m clear of walls, lockers, door corners and bags. The graph is built by act 3 and handed to the pure brain.
- The scripted encounter is removed. The creature starts on a patrol and the first alert teaches hiding (the `act3.hold` line plays the first time the player hides while hunted).
- Hiding spots share one type: locker, door corner, bag. `hidden` is true in all three. The creature is never routed into them; a noise heard from a spot is mapped to the spot's outside point.
- Leaving a spot adds a small noise (0.15) and the heard position is the outside point, so it never gives the player away.
- Noise threshold: `0.25 + 0.04 * distance` (was `0.2 + ...`). Extra decay of 0.9/s when still.
- Walk cycle: the old pose leaned back with knees and elbows bent backward, which read as walking backward. Spine leans forward, knees and elbows bend forward, arms swing against the legs.
- Creature sound: one quiet sample every 8 to 15 s while hunting, plus steps and the scream only in `hunt` mode. The 2.2 s breathing loop is removed.
- Swallow timeline (`procgen/lunge.ts`): appear 0 to 0.25, jaws open 0.25 to 0.6 with a jolt and the scream at 0.6, slam 0.6 to 0.8, hard black at 0.8, end 0.85. It is the same effect for the ending and for being caught.
- The real cabin after waking uses the shared cabin builder in `src/procgen/cabin` (act 2 look, lit, front panel present). Act 3 does not import act 2 code.
- Choice prompt releases the pointer lock while open (`shouldHoldLock` gets a `choice` flag).
- No act 3 recording exists in `public/audio/vo`; item 7 needs no file removal (rule 4 forbids touching that folder).
- Per the prompt, no e2e script is run in this spec; `e2e/act3.mjs` and `e2e/playthrough.mjs` are updated only.

## Checkpoints and map
`start` in the bag, `wp0` at the junction (0, -4.4), `wp1` before the cage bars, `wp2` set on laying the first crewman down, `wp3` set when the player returns to the cage with the corridor silent.

## Notes from the work
- Visors up: the figure builder got a `visorUp` option that drops the gold visor shell. The helmet inside is a dark ball, so no face is modelled or shown.
- `act3.impostor` stays a CAPCOM line. The beat still shows it as "HOUSTON?" with a detune, as before.
- The creature starts on its patrol at waypoint 5 (hall) for `start` and `wp0`, so it reaches the junction after about 40 s. The e2e scripts teleport only where it is 8 m away.
- Right store room spans rows 8 to 11 so it does not merge with the right crew bay (a layout test guards this).

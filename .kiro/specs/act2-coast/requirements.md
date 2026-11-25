# Requirements: act2-coast

Chapter 3, evening of day three, zero gravity. The player floats from the command module (CM) through the docking tunnel to the lander, fixes a snapped breaker with a pen, floats back through a tunnel that is now 1.5 m longer, gets into a sleeping bag and sleeps. Z runs from the CM (+z) to the lander (-z).

## 1. World
1.1 The scene shall hold a lander cabin (z -6.5 to -3, x -1.4 to 1.4, 2.4 m tall), a docking tunnel (z -3 to `cmFar`, 0.9 m across, ribbed, a hatch ring at each end) and a CM sleep station (z `cmFar` to `cmFar` + 3.5, 2.8 m wide, 2.4 m tall), all white with orange and yellow stripes.
1.2 The lander left wall shall carry dark grey breaker panels with rows of round knobs and a yellow and black striped bar. One breaker at (-1.05, 1.4, -5) shall have a snapped knob.
1.3 The lander shall have two small triangular windows angled in toward the middle showing stars, an instrument panel on the right wall, and a felt-tip pen at (0.6, 1.5, -4.2) that tumbles and bobs.
1.4 The CM room shall have a warm white ceiling light at its middle, the commander asleep on the left wall at `cmFar` + 1.2, Mike asleep on the right wall at `cmFar` + 2.4 (no helmets, eyes down, bobbing), and the player's empty unzipped bag on the left wall at `cmFar` + 2.75.
1.5 `cmFar` shall start at 1.5 and become 3.0 when the breaker is fixed. The tunnel, its hatch ring, the CM room, the figures, the rails and the collision boxes shall all be rebuilt for the new value while the player is in the lander.
1.6 Collision shall keep the tunnel passable: a capsule at the tunnel centre line shall be free at every z from -3 to `cmFar`.
1.7 Handrails shall run at x = -1.1 to 1.1 (clamped to 0.4 inside the tunnel), y = 1.6, every 1.5 m from `cmFar` + 2.7 down to the lander. Each is a PULL target and is removed once the player is in the bag.

## 2. Start and ambience
2.1 When the act starts, the player shall be at (0, 0.3, 3.5) facing -z in zero-g mode, with the ship bed, hum 1, breathing on, fear 0.1 and heart rate 76.

## 3. Beats
3.1 At 1 s Mike shall say `act2.night` with the view on his head, then the commander shall say `act2.out` with the view toward (0, 1.3, -4.5). The objective shall be `act2Out` from the start. The `push` hint shall show the first time a rail is in reach.
3.2 When the player crosses z < -3.2 the phase shall become `fix`, the objective `act2Fix`, and the commander shall say `act2.breaker` with the view on the breaker.
3.3 While in `fix` and not holding the pen, the pen (GRAB, radius 0.2) shall be usable. Using it shall play `click`, set holding, set the objective `act2Push`, make the commander say `act2.pen`, and show the pen held in front of the view.
3.4 While in `fix` and holding the pen, the breaker (GRAB, radius 0.25) shall be usable. Using it shall play `breakerPush`, set the phase `return`, grow the tunnel, set the objective `act2Back`, set tension UNEASE, and make the commander say `act2.fixed` with the view turned back up the tunnel.
3.5 When the player crosses z > `cmFar` in `return`, `tunnel-longer` shall be added to `anomaliesSeen` and the phase shall become `sleep`. Mike shall say `act2.longer` with the view on him, then the commander `act2.sleep` with the view on him, then the objective shall become `act2Sleep`.
3.6 In `sleep`, the bag (SLEEP, radius 0.5) shall be usable. Using it shall play `zipper`, pin the eye just above the bag top looking across the cabin (yaw -90 degrees) with look-around but no movement, remove the rails, set the objective `act2Eyes` and show the `sleep` hint.

## 4. Sleep
4.1 While C is held the blackout shall ease toward 1 in about 0.33 s, and ease back to 0 on release.
4.2 While the eyes are closed: after 1.5 s of total closed time Mike shall whisper `act2.flashes` once. Every 0.4 to 1.3 s a small white flash shall appear at a random screen spot, keeping the last 6. Every 2.2 to 3.2 s the `breathe` sound shall play from (0, 2, `cmFar` + 1.5). After 4 s Mike shall whisper `act2.breath` once.
4.3 After 11 s of total closed time the last flash shall show a dark figure silhouette, `fourth-sleeper` shall be added to `anomaliesSeen`, and 1.2 s later `completeAct()` shall run. Closed time shall add up across presses.

## 5. Content
5.1 All subtitles and checklist strips shall live in `src/content/` and follow the copy rules (90 characters or fewer per line).
5.2 Required tests: the phase machine, the tunnel layout (including the capsule property test) and the sleep timer on a fake clock.
5.3 `e2e/act2.mjs` shall play the act from its start to the hand-off to `act3-farside` and be part of `npm run e2e`.

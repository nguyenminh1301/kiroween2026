# Requirements: act3-farside

Act 3 is the core of the game. Behind the Moon there is no radio. The player is Buzz, in zero-g. Something in the tunnel hunts by sound. All text is in `src/content/`.

## 1. Corridor
1.1 WHEN act 3 loads, THE scene SHALL show a chamfered tunnel 2.4 m wide and 2.4 m tall, from z +4 to z -44, as merged geometry in a few draw calls (under 150 total).
1.2 THE corridor SHALL have two hiding bays on the left wall (z -11 to -9.5, z -23 to -21.5), each with a solid stowage locker, and two doorways on the right wall (z -17 to -15.5, z -29 to -27.5) into a side room (x 1.6 to 4.4, z -30 to -14).
1.3 THE collision SHALL cover floor, ceiling, walls with the gaps, lockers, bay walls and side room walls.
1.4 THE corridor SHALL have PULL handrails at x = +-1.1, y = 1.6 every 1.5 m from z 3.25 to -43, skipping 0.6 m around each opening.
1.5 THE lighting SHALL be black fog 2 m to 13 m, one flashlight spot light on the camera, and no other dynamic light.
1.6 THE floor strips SHALL be dark while sneaking and SHALL show a light wave toward the hatch during the chase.

## 2. Sound and the body
2.1 THE noise SHALL stay within 0 to 1, decay 0.3 per second, gain 0.2 per push and 0.3 per wall bump, and keep a floor of min(0.6, speed * 0.1) while moving and 0.12 while breathing.
2.2 WHEN the player holds their breath while still and not pushing, THE noise SHALL cap at 0.1.
2.3 THE hearing threshold SHALL be 0.2 + 0.04 * distance. THE creature SHALL hear nothing beyond 6.5 m, and nothing from a hidden player who holds their breath.
2.4 THE creature SHALL see an unhidden player within 1.1 m in any direction, or within 3.5 m in front of it (cos angle above 0.55).
2.5 SPACE SHALL hold the breath for up to 8 s, then force it out until SPACE is released.
2.6 THE heart rate SHALL move toward 70 + 100 * fear at 20 bpm/s, plus 8 bpm/s while holding, within 50 to 180.
2.7 THE tension SHALL change only by legal events (CALM, UNEASE, STALK, CHASE, RELEASE). RELEASE settles to UNEASE after 6 s. Fear follows the state target at 0.3 per second.
2.8 WHILE sneaking, THE noise meter SHALL show noise / threshold(distance) with a white tick at 1, yellow turning red past 64%.
2.9 `window.__los.director` SHALL expose `{ state, noise, threshold, monster: { pos, mode } }`.

## 3. Creature
3.1 THE creature SHALL be built in code, about 2.1 m tall, and never fully lit, with a stalk walk, a freeze and a low crawl.
3.2 THE creature SHALL patrol the loop (0,-28.25) to (0,-16.25) to (3,-16.25) to (3,-28.25) at 0.8 m/s.
3.3 WHEN it hears or sees the player, THE creature SHALL alert for 1.8 s, hunt at 1.45 m/s to the last known position, search for 2.5 s, and then give up or hunt again.
3.4 WHEN it is within 0.8 m of an unhidden player, THE player SHALL be caught.

## 4. Beats
4.1 Checkpoints are `start`, `wp0`, `wp1`, `wp2`, `wp3`. Passing z -5, -12, -31.5 and -38 sets wp0 to wp3.
4.2 Wake: fade in over 2.5 s, whispers `act3.wake`, `act3.wake2`, objective `act3Find`, `push` hint, Mike calls `act3.call1` at z -1.5.
4.3 Encounter at z -5 or at `wp0`: the creature walks out of the first doorway to z -7.2, pauses 2.5 s and goes back. Objective `act3Hide`, the `breath` hint inside a locker, then `act3Sneak`.
4.4 Lockers: E on the door (verb HIDE) steps in, the door closes, the view faces the corridor. After 0.4 s, E steps out.
4.5 Passing z -12 the first time: `act3.impostor` as UNKNOWN, detuned +7 Hz, then `act3.nohouston`, anomaly `impostor-capcom`. Passing z -24: `act3.call2`.
4.6 Reveal at z -38: Mike speaks, the creature appears behind him, Mike shouts `act3.cmp`, the view turns to the hatch.
4.7 Chase from 4.2 s: gap starts at 6 m, each push adds 0.5 (max 6), the gap closes at 1 m/s from 1 s after the last push or while Q is held. Gap 0 means caught. The screen edges darken as the gap shrinks.
4.8 Hatch: using it during the chase plays `hatchSlam`, goes black, knocks, the closing lines, then `completeAct()`.
4.9 Caught: `sting`, red flash with "It found you. Back to the last checkpoint." for 1.5 s, then reload at the current checkpoint with no chapter card.
4.10 Paused time SHALL NOT count toward any chase gap or timer.

## 5. Tests
5.1 Unit and property tests for noise, hearing, tension, breath hold, chase gap, patrol, and the beat flow on a fake clock (6 property tests at most).
5.2 `e2e/act3.mjs` plays the act and is part of `npm run e2e`.

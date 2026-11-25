# Requirements: act4-moon

Act 4: the landing and the moonwalk. The player is Buzz. All text is in `src/content/`. Nothing outside the lander makes a sound, only the radio, the helmet breathing and the heartbeat.

## 1. Scene
1.1 THE terrain SHALL be a 120 m square height field (80 cells, seed 9) of rolling regolith (#D8D4C6) with craters of many sizes and scattered angular rocks, lit by one hard low sun, with no fog.
1.2 THE terrain SHALL have three pits of radius 2.4 at (-3, 18), (17.5, 8.5) and (-15.5, -9.7), each lower than its rim.
1.3 THE ground SHALL stay flat within 0.05 m around the lander and the three task sites. `groundAt(x, z)` SHALL give the height for walking and for placing things.
1.4 THE sky SHALL be black with about 700 stars and an Earth disc (radius 6) at (-40, 75, -110).
1.5 THE lunar module SHALL stand at the origin: octagonal descent stage in gold foil, four splayed legs with footpads, a ladder down the front leg (z 1.9 to 4.1), a porch, an ascent stage on top, and an equipment bay left of the ladder.
1.6 THE task sites SHALL be at flag (-1.5, 9), sample (9, 4.5) and seismometer (-8, -5), each with a small orange ring on the ground.
1.7 THE scene SHALL stay under 150 draw calls and 150k triangles.

## 2. Movement and sound
2.1 THE player SHALL walk at 2.5 m/s under Moon gravity 1.62, jump with SPACE at 2.2 m/s take-off, follow `groundAt`, and collide with the lander's legs and stage.
2.2 THE ambience SHALL have hum 0 and bed 'none' on the surface. Inside the lander during the descent, hum 0.25.
2.3 THE creature and the engines SHALL make no sound outside.

## 3. Descent (checkpoint `start`)
3.1 THE descent SHALL be a 24 s timeline with the player seated. THE lander height SHALL be `40 * max(0, 1 - t/22)^1.6`.
3.2 THE shots SHALL all be outside: 0 to 7 s high and to the side, 7 to 13 s from below looking up at the plume (fov 80), 13 to 19 s from the ground far off, 19 to 24 s low and close (fov 60).
3.3 THE descent plume SHALL show while the height is above 0.02 m. BELOW about 10 m, a flat sheet of dust SHALL blow outward along the ground and grow as the lander gets closer.
3.4 THE DSKY overlay SHALL follow: 0 s PROG 63 VERB 16 NOUN 68; 0.5 s `act4.go`; 4 s alarm 1202, a beep, `act4.alarm`; 8 s PROG 64 VERB 06 NOUN 63, alarm cleared, `act4.goalarm`; 11 s alarm 1201 and a beep; 13 s alarm cleared, `act4.sixty`; 17 s `act4.thirty`; 21.5 s `act4.contact`.
3.5 THE camera SHALL shake 0.02 until 22 s. Tension UNEASE, fear 0.3, heart rate 110.

## 4. Surface tasks (checkpoint `tasks`)
4.1 WHEN the EVA starts, THE DSKY SHALL hide and the player SHALL stand at (1.3, ground, 6.4) with yaw 0.36, fear 0.2, heart rate 96.
4.2 THE commander SHALL say `act4.flagtask` with the view on the flag kit, then `act4.jobs` with the view on the equipment bay. THEN the `act4Tasks` objective and the `jump` hint SHALL show.
4.3 THE objective text SHALL list only the tasks not done, joined by ". ", after "Surface tasks, any order: ". WHILE carrying an item it SHALL read "Carry the flag to its marker and plant it", "Take the scoop to the sample marker" or "Carry the seismometer to its marker".
4.4 WHEN the player uses (GRAB) the flag kit (radius 0.6), the scoop (0.35) or the seismometer (0.35) while carrying nothing, THE item SHALL be carried and its line SHALL play.
4.5 THE player SHALL carry one item at a time. A task SHALL need the right item and SHALL NOT be done twice.
4.6 WHEN the player uses a site (radius 0.8) with the right item, THE flag, filled sample bag or seismometer SHALL be placed and its line SHALL play.
4.7 THE objective markers SHALL show only the enabled targets.

## 5. Emerge and run (checkpoint `run`)
5.1 WHEN the third task is done, THE objective SHALL clear, that task's line SHALL play, then the creature SHALL rise out of the pit behind that task over 2.2 s and stand at the rim for 1.4 s.
5.2 ON emerge THE checkpoint SHALL become `run`, with a sting, tension CHASE, fear 0.85, heart rate 150, objective `act4Run`, the `jump` hint, and the shout `act4.emerge` with the view on the creature for 1.4 s.
5.3 THE creature SHALL then chase straight at the player at 1.8 m/s. WITHIN 1.0 m the player SHALL be caught: sting, red flash, restart at `run`.
5.4 THE `run` checkpoint SHALL put the player at the last task's site (the seismometer) facing the lander, with the creature just up.
5.5 WHEN the player uses the ladder (radius 0.7) during emerge or run, THE player SHALL climb from (0, 0.1, 4.3) to the porch (0, 1.6, 2.6) over 1.3 s looking up.

## 6. Liftoff
6.1 THE liftoff SHALL be a 14 s timeline, seated: `act4.liftoff` at 0.3 s; the creature leaps onto the stage roof (1.35, 3.05, 1.35) over 1.1 s in a 1.5 m arc.
6.2 AT 1.4 s THE ascent engine SHALL fire down: sting, the caption `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE` in amber for 4 s, the `burn-baby-burn` anomaly, and an orange plume that fades over 7 s.
6.3 THE ascent stage SHALL rise `(t - 1.4)^1.8 * 0.9`. THE creature SHALL sink into the stage (up to 1.6 m) and vanish. THE flag SHALL tip over 0.4 s after the fire starts.
6.4 THE shots SHALL be: 0 to 1.5 s wide, 1.5 to 5 s beside the engine looking down (fov 80), 5 to 9 s from the ground looking up, 9 to 14 s pulling back. Shake 0.12 at 1.6 s, 0.05 at 5 s, 0 at 9 s.
6.5 AT 7 s THE commander SHALL say `act4.burned`, at 10.5 s Mike SHALL say `act4.columbia`. THEN `completeAct()`.

## 7. Tests
7.1 Task rules, objective text, terrain flatness and pits, chase speed and catch, descent events and height formula (unit and property tests).
7.2 `e2e/act4.mjs` plays the act from `start` to `act5-home`, then checks the catch at `run`.

# Requirements: act0-pad

Chapter 1, Pad 39A, plus the shared pieces later acts reuse. Terms: the Player is Buzz Aldren. Sizes are in metres.

## 1. Shared pieces

1.1 THE figure builder SHALL build a suited person about 1.8 m tall from boxes and cylinders, as a bone hierarchy, under 800 triangles.
1.2 THE figure builder SHALL offer helmet on or off (off shows a cap and a dark featureless face) and a white pressure suit or white pad-crew coveralls.
1.3 THE figure SHALL support the poses `standing` (slow idle sway), `wave(t, amount)` (right arm up and swinging), `seated` and `resting`.
1.4 WHEN a figure is created with a name, THE anchor registry SHALL return its head position by `headOf(name)`, and the anchor SHALL sit at about 1.7 m for a standing figure.
1.5 THE sky dome SHALL be a gradient sphere (top, horizon, bottom colors) with no fog, drawn behind everything, and THE sun disc SHALL be a flat bright disc low on the horizon.
1.6 WHEN an act calls `completeAct()`, THE loader SHALL load the next act from its first checkpoint, and after act 5 SHALL show the Archive.
1.7 THE new textures SHALL be crisp, high contrast and drawn through the procgen texture cache, at 128 px with features of at least 2 px.

## 2. Scene

2.1 THE walkway SHALL be 2 m wide from z = 6.5 to z = -6, with 1.2 m railings on both sides, a grating floor and red steel framing, all as collision boxes.
2.2 THE White Room SHALL span z = -6 to z = -9, 2.8 m wide and 2.6 m tall, with a 1.4 m door opening, a warm ceiling light and a round hatch at (0, 1.25, -8.95).
2.3 THE Saturn V SHALL stand beyond the White Room with a white upper stack, a black roll pattern and an escape tower spike.
2.4 THE ground and sea SHALL lie at y = -100 under fog #c8b49a from 120 m to 700 m, with a sky dome (#3f5f82, #f2c38d, #3a3326) and a pale sun low at the left of the start view.
2.5 THE crowd SHALL be about 4000 billboard figures drawn in one instanced call, with two frames (arms down, arms up).
2.6 WHILE crowd excitement is above 0.15, THE crowd SHALL jump and raise arms more and flashbulbs SHALL pop more often, and excitement SHALL decay to 0.15 over about 15 s.
2.7 THE pad crew SHALL be `pad0` at (0.7, 0, 2.6), waving down at the crowd every couple of seconds until the player has waved, and `pad1` at (0.9, 0, -8.2).
2.8 THE walkway SHALL show 12 alternating boot prints from z = 3.5 into the White Room and none leading out, and the sighting `extra-bootprints` SHALL sit at (0.4, 0.05, -1) with radius 1.5.
2.9 THE start SHALL be (0, 0, 5) facing -z in walk mode at 1.4 m/s with Earth gravity.
2.10 THE scene SHALL stay under 150 draw calls and 150k triangles from the start position.

## 3. Ambience

3.1 THE act SHALL play no ship hum, wind 1, birds on, no helmet breathing, and footsteps while walking.
3.2 WHEN the player is inside the White Room (z < -6.2), THE birds SHALL stop and wind SHALL drop to 0.3.
3.3 UNTIL the player enters the White Room, THE crowd SHALL cheer every 9 s, or every 7 s after the wave.

## 4. Beats

4.1 WHEN 0.8 s have passed, THE act SHALL show the `walk` hint and the narrator SHALL say `act0.intro1` then `act0.intro2`, with the view turning toward the crowd (110, -100, -10) during intro2, then PAD SHALL say `act0.pad1` with the view on `pad0`'s head.
4.2 WHEN `act0.pad1` ends and the player has not waved, THE objective SHALL become `act0Wave`.
4.3 WHILE the view direction has y < -0.2 and |x| > 0.4, THE WAVE interactable SHALL be the target in place of the normal ray pick.
4.4 WHEN the player uses WAVE, THE crowd excitement SHALL be 1 and `cheer` SHALL play.
4.5 WHEN the player waves for the first time, THE objective SHALL become `act0Board` and PAD SHALL say `act0.pad2` with the view toward (0, 1.3, -7). A later wave SHALL only cheer again.
4.6 WHEN the player first enters the White Room, `pad1` SHALL say `act0.pad3` with the view on `pad1`'s head.
4.7 WHEN the player uses the hatch (a GRAB, radius 0.6, once, marker of `act0Board`), THE act SHALL play `switch`, clear the objective, have CDR say `act0.board` and then call `completeAct()`.

## 5. Content

5.1 THE subtitles `act0.pad1`, `act0.pad2` (shout), `act0.pad3` and `act0.board` and the checklists `act0Wave` and `act0Board` SHALL be added with the text from the brief.

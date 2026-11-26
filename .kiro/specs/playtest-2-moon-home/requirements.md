# Requirements: playtest 2, acts 4 and 5

The creature exists only in the act 3 dream. Nothing in acts 4 and 5 or the Archive hints at it or at a fourth person.

## 1. The player's eye in the cabins
1.1 In the lunar module (descent and ascent) the cabin shots shall put the eye at helmet height for a standing Buzz, looking out of a window or at the panel.
1.2 In the command module in act 5 the eye shall sit at helmet height for a seated Buzz, looking out of the window or at the panel.
1.3 The player's own head and torso shall not be drawn.
1.4 The cabins shall have the brighter light and small objects of acts 1 and 2: checklists, cue cards, a pencil on a string, a camera.

## 2. Neil on the surface, Mike in orbit
2.1 Neil shall climb down first, seen from the hatch. Then Buzz shall climb down with the ladder animation.
2.2 Mike shall stay in orbit and speak on the radio only.
2.3 Neil shall ask Buzz to plant the flag at the marker, then to stand at a marked spot beside it.
2.4 For the photo Neil shall stand a few metres from Buzz, face him and lift the camera on his chest. A flash and a shutter click shall come before the NASA photo shows as today.
2.5 During and after the photo Neil shall walk between a few spots near the lander, facing the way he walks, with a low-gravity walk cycle. At the spots he shall scoop soil into a bag, kneel at rocks, write on his cuff checklist and take photos.
2.6 Buzz's tasks shall stay: flag, soil sample, seismometer.
2.7 The flag shall be the United States flag: red and white stripes, a blue canton with white stars, on a pole with a horizontal rod along the top edge.

## 3. Liftoff
3.1 The ascent flame shall be a long narrow cone whose soft tail fades out over about three times the length of the ascent stage.
3.2 Four reaction control clusters on the corners of the ascent stage shall each fire white puffs (a small cone for 0.1 to 0.3 s) now and then during the climb and turn, and on the lander during the descent.
3.3 The cut from the liftoff shot to the next act shall load the next act before the shot ends, fade to black and switch, with no stutter and no hang on the Moon.

## 4. Act 5 shake and sounds
4.1 The command module shake in act 5 shall not exceed the launch cap: 0.4 degrees and 1 cm. It shall be strongest at peak heating and at the chute openings.
4.2 After splashdown the waves shall be a soft background under the voices.

## 5. Bigger parachutes
5.1 The two drogues shall be about 5 m across and the three mains about 25 m across each, on lines about 30 m long.
5.2 All three mains shall show side by side, each round, red and white, swaying as a group.
5.3 The deploy order (cover, drogues, pilot chutes, reefed mains, full mains) and the release after splashdown shall stay.

## 6. Dialogue of acts 4 and 5
6.1 The lines of acts 4 and 5 shall be replaced with the text in the prompt. All are subtitles only.
6.2 `act5.end.mp3` and any recording whose line changed shall be removed. Lines the flows no longer use shall be removed.

## 7. Archive
7.1 The Archive shall be titled "What really happened" and list real Apollo 11 moments the game shows: the 1202 alarm, "The Eagle has landed", the flag knocked over by the ascent engine, the seismometer picking up footsteps, `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE`, the loss of signal behind the Moon, the launch escape tower and its cover leaving with the windows uncovered, USS Hornet and Helicopter 66.
7.2 Each item shall give what the player saw, the real fact and a source, marked seen or missed.
7.3 The player's act 3 answer line and the NASA photo credit shall stay.
7.4 The old anomaly ids shall be gone from code, tests and `product.md`.

## 8. Steering
8.1 `.kiro/steering/product.md` shall describe the game as it is: acts table, Archive, controls and anti-goals (the dream may show blood; the creature never appears outside the dream).

## 9. Final check
9.1 Test, lint, build, budget, copy and e2e shall pass. `README.md` and `docs/KIRO.md` shall cover this round.

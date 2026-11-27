# Design notes

- Task 1: a `cabinBox` in `hatchScene.ts` built from six dark slabs behind the doorway, slightly overlapping the frame so no light leaks.
- Task 2: eye derived from couch constants in a pure `eyeRig.ts`; the launch timeline is rewritten in place, cabin time summed in a test.
- Task 3: the computer comes back from the pre-`7bf70bf` code (`clearLine`, three `act2:compN` interactables). It takes no control from the player, so it has no close-up; only the gauge uses the close-up helper.
- Rails: reach is `HANDRAIL_REACH` to the nearest point of a bar. Bars are added in the lander; the test samples free capsule positions and walks a bar graph (two bars are linked when one free position reaches both).
- Decision: lines whose ids are dropped are removed from `src/content` and from timelines.
- Task 2 eye: the seated figures have their pelvis at y 0.55 (the "seat pan", `SEAT_PAN_Y`) and the helmet bubble centre at y 1.28, z 0.76, radius 0.172. The eye is 0.72 above the pan and 0.1 behind the helmet front (0.688 in z), so it lies inside the helmet. The old eye was at the neck, in front of the helmet. Act 5 uses the same eye. The panel centre follows the eye (0.7 in front, 0.2 above) and the DSKY, switch and O2 spots move with it. The Earth direction in the windows moved to azimuth 17 degrees so the disc stays in the right window.
- Task 2 act 2: act 2 has no couch scene (the player floats and then sleeps in the bag), so the couch eye test covers acts 1 and 5, the two places the player sits in a couch.
- Task 2 timeline: shots padFar 0 to 3.3, padLow 5.2 to 8.6, staging 11.6 to 14.2, jettison 14.2 to 17.6 are unchanged. Cabin time from ignition (3.5) to orbit shutdown (22.9) is 1.7 + 3.0 + 5.3 = 10.0 s. `act1.count2` is restored (it had been removed in an earlier round).

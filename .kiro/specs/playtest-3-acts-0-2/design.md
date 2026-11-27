# Design notes

- Task 1: a `cabinBox` in `hatchScene.ts` built from six dark slabs behind the doorway, slightly overlapping the frame so no light leaks.
- Task 2: eye derived from couch constants in a pure `eyeRig.ts`; the launch timeline is rewritten in place, cabin time summed in a test.
- Task 3: the computer comes back from the pre-`7bf70bf` code (`clearLine`, three `act2:compN` interactables). It takes no control from the player, so it has no close-up; only the gauge uses the close-up helper.
- Rails: reach is `HANDRAIL_REACH` to the nearest point of a bar. Bars are added in the lander; the test samples free capsule positions and walks a bar graph (two bars are linked when one free position reaches both).
- Decision: lines whose ids are dropped are removed from `src/content` and from timelines.

# Requirements: playtest 3, acts 0 to 2

1. **Act 0 hatch interior.** WHEN the hatch is open, THE scene SHALL show a closed, dark box behind the opening with at most a faint couch shape. THE box SHALL be solid from every standing position on the arm, with no gap at the frame edges.
2. **Act 1 short launch, eye, panel.**
   2.1 THE time in the cabin from ignition to orbit shutdown SHALL be about 10 s. Outside shots stay as they are and carry most beats.
   2.2 THE launch lines SHALL be `act1.count2`, `act1.liftoff`, `act1.staging`, `act1.jettison`, `act1.orbit`. Other launch lines are dropped. Lines may play over an outside shot.
   2.3 WHEN the player is strapped in the middle couch, THE eye SHALL be about 0.7 m above the seat pan and about 0.1 m behind the front of the helmet, in act 1 (launch and TLI) and act 2.
   2.4 THE main panel centre SHALL be about 0.7 m in front of the eye and 0.1 to 0.3 m above it, with the DSKY at the centre within reach.
   2.5 A unit test SHALL check the eye and the panel against the couch.
3. **Act 2 tasks and rails.**
   3.1 THE act SHALL have three tasks: oxygen line (hammer, three taps), cabin pressure gauge, and the computer with three red lines the player clicks until all are green.
   3.2 THE breaker panel, the landing site keypad, their cards, lines and tests SHALL be removed. Lines `act2.comp` and `act2.compdone` are added; `act2.panel`, `act2.paneldone`, `act2.site`, `act2.sitedone` are removed.
   3.3 THE gauge close-up SHALL give control back when done, on Esc, or when the player moves away.
   3.4 FROM every place the player can reach, a handrail SHALL be within reach, and the rails SHALL form an unbroken chain to the sleeping bags. A test SHALL walk that chain from the farthest point of the lander and of the command module.
4. **Testing.** Per task: unit tests of changed code and lint only. E2E scripts of acts 0 to 2 and the playthrough are updated, not run.

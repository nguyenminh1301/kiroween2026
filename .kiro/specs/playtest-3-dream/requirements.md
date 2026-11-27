# Requirements: playtest 3, the dream

Story and dialogue stay as they are.

1. **The way into the dream.**
   1.1 THE doorway between the cabin and the corridor SHALL have nothing standing in it. The red bar at its middle is removed.
   1.2 EVERY prop the player can reach on the map SHALL have collision or be removed. A test checks the props against the collision boxes.
2. **A window on the captured crew.**
   2.1 THE wall of the first junction (`wp0`) SHALL have a small window with a grille that looks into a lit room with Neil and Mike hanging upside down.
   2.2 THE window SHALL be closed to the player and to the creature: it sits in a wall, and the room behind it lies in no open map cell.
3. **Hiding spots.**
   3.1 THE spot behind open doors SHALL be removed with its code, hint text and tests. Lockers and sleeping bags stay.
   3.2 INSIDE a sleeping bag THE view SHALL be a slit about one fifth of the screen high and about two thirds of its width, with soft dark edges and the fabric shape around it.
4. **The creature and the swallow.**
   4.1 THE creature SHALL be scaled so its top stays at least 0.15 m under the ceiling at every point of the walk cycle, stooped forward. A test uses the corridor height.
   4.2 THE swallow SHALL take about 1.5 s: face lit in front of the camera, held 0.4 s; head splits open with teeth and throat, 0.5 s; upper and lower teeth close from the top and bottom edges with a hard jolt and a red flash, 0.3 s; cut to black. The same swallow plays when caught and at the end.
5. **Clear goals.**
   5.1 WITHIN 3 m of the cage door, THE door handle SHALL glow and the hint SHALL name the door.
   5.2 WHILE a crewman is carried, a yellow marker over the sleeping bags SHALL show at any distance and through walls. It hides when he is set down.
6. **Testing.** Per task: the unit tests of changed code and lint only. `e2e/act3.mjs` and `e2e/playthrough.mjs` are updated, not run.

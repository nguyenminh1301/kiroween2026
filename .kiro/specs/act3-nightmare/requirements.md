# Requirements: act3-nightmare

Act 3 (`act3-farside`) is rebuilt as Buzz's dream. It plays as real until he wakes. The act id, chapter card, corridor art, noise meter, breath hold (SPACE), lockers, director and checkpoints `start`, `wp0`, `wp1`, `wp2`, `wp3` stay.

## 1. Story

1.1 WHEN act 3 starts at `start`, THE game SHALL put Buzz in his sleeping bag in the cabin, with the other two bags empty and unzipped, the tunnel hatch open, and the objective "Find Neil and Mike."
1.2 THE dream SHALL use walking with gravity (WASD, no rail pushes) and SHALL show no blur, wobble, filter or text that says it is a dream.
1.3 WHILE Buzz walks the corridor, THE creature SHALL hunt by sound as before, and the lockers SHALL work as before.
1.4 WHEN Buzz reaches the far end, THE game SHALL set `wp1` and show Neil and Mike strapped to the wall of one caged room, whispering. WHEN Buzz presses E on the cage, THE cage SHALL open.
1.5 WHEN the cage is open, E on Neil or E on Mike SHALL pick that crewman up as the first one carried, and the objective SHALL be "Carry him back to the bags."
1.6 WHILE a crewman is carried, THE player SHALL walk slower and make more noise per step. Holding breath and hiding in a locker with him SHALL work. IF the creature catches Buzz, THEN THE act SHALL restart at the last checkpoint with no gore.
1.7 WHEN Buzz presses E at the bags with a crewman carried, THE crewman SHALL lie in his bag, `wp2` SHALL be set, and the objective SHALL be "Go back for the other one."
1.8 AFTER `wp2`, THE corridor SHALL be silent: no clicks, scrapes or hunting music, only the hum and the player's breathing, and the creature SHALL not be in the corridor.
1.9 WHEN Buzz is back at the cage, THE game SHALL set `wp3` and show the second crewman seated with his back to the wall.
1.10 WHEN Buzz presses E on the second crewman, THE creature SHALL rise from behind him and lunge into the camera, its head opening into a huge mouth that closes over the view, black, in about 1.2 s, with a hard sting and the creature scream.
1.11 THE impostor Houston line (`impostor-capcom`) SHALL play once in the corridor on the way to the cage and mark the anomaly.

## 2. The creature

2.1 THE creature SHALL be a thin deformed astronaut about 2.4 m tall: torn stained off-white suit, limbs too long, joints bending slightly wrong, long-fingered gloves, bare dark skin in the tears, cracked dark visor, no face, no name tag, no flag patch.
2.2 THE creature SHALL move in held poses that snap, and tilt its head toward sounds.
2.3 FOR the lunge, THE head SHALL split from the visor down into a wide mouth with uneven teeth and a dark wet throat that fills the view.
2.4 THE model SHALL use at most 3,000 triangles, with a dim red rim in the dark and a lit look under the flashlight, and no second dynamic light.

## 3. Carrying

3.1 WHILE carrying, THE view SHALL show a crewman across Buzz's shoulders in the lower part of the view: a gloved arm and a boot at the edges, the helmet near the left edge, swaying with each step, covering at most the bottom quarter of the screen.
3.2 THE carried crewman SHALL whisper `act3.carry.*` now and then, and `act3.down.*` after being laid down. These lines show as subtitles only.

## 4. Locker view

4.1 THE locker view SHALL have no 2D overlay. THE camera SHALL sit inside a real locker model with a slatted door about 25 cm in front of the eye, clear gaps between dark slats, the corridor lit dimly by the floor strips and a faint red ambient.
4.2 Mouse look inside the locker SHALL be limited to about 30 degrees.

## 5. Waking

5.1 AFTER the black (1 s), THE game SHALL show the real act 2 cabin, Buzz in his bag, lights low, a sharp gasp, Neil and Mike in their bags turned toward him.
5.2 THE lines `act3.wake.cmp` then `act3.wake.cdr` SHALL play, then two choices SHALL show at the bottom in menu style, picked by mouse or keys 1 and 2, each followed by its reply (`act3.reply.dream` or `act3.reply.fine`).
5.3 AFTER the reply, THE game SHALL fade to black and complete the act. THE choice SHALL be stored in the session.
5.4 Pause and the debug contract SHALL keep working during the choice. With `?debug`, `__los.act3` SHALL expose `phase`, `carriedFirst` and `pick(n)`.

## 6. Archive

6.1 THE act 3 Archive entry SHALL say the corridor and the creature were a dream, keep the real fact behind `impostor-capcom`, and show "You told them: ..." with the player's choice.

## 7. Text

7.1 New lines follow `.kiro/steering/writing.md`, have no recorded voice, and show as subtitles.

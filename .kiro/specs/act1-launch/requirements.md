# Requirements: act1-launch

Chapter 2, Launch, and the command module cabin. The Player is Buzz Aldren in the right couch. Sizes are in metres.

## 1. Cabin

1.1 THE cabin SHALL be a cone-shaped room of beige (#CFC8B6) painted panels with seams, rivets and stencil marks, narrowing to a round hatch window about 2.6 m overhead, with two side windows.
1.2 THE console SHALL be an arc of seven panels, each 0.6 by 0.78 m, tilted back 0.5 rad, spaced 0.21 rad apart, 1.25 m in front at 1.55 m height, built as merged geometry with vertex colors. The outer two panels SHALL be all breakers.
1.3 THE console SHALL keep three spots clear: DSKY (0.28, 1.42, -1.02), red switch (0.62, 1.2, -0.98), O2 flow gauge (-0.35, 1.5, -1.05).
1.4 THE DSKY SHALL be a 128x160 canvas texture with status lamps (KEY REL white, PROG ALARM amber) on the left, and a black window with green PROG, VERB, NOUN and three signed 5-digit registers, redrawn when its state changes.
1.5 THE three big center dials SHALL follow an engine level from 0 to 1, and the master alarm lamp SHALL flash red while set.
1.6 THE windows SHALL take the act's sky color, show stars in space, and show an Earth disc with a low-res cloud texture when the act sets it.
1.7 THE cabin SHALL hold three couches. The commander (x = -0.65) and Mike (x = 0) SHALL sit in white pressure suits with helmets in the seated pose. The Player's eye SHALL be at about (0.62, 1.17, 0.45), seated, pitched down 0.25 rad.

## 2. Outside sets

2.1 THE pad set (x = 3000) SHALL hold a Saturn V about 110 m tall with the escape tower, black roll pattern and five engine bells, a red launch tower, a grey pad and a flame trench.
2.2 WHEN the engines ignite, THE pad set SHALL show flame under the engines and up to 600 instanced smoke and steam puffs pouring to both sides of the trench and rising. After liftoff the rocket SHALL rise with y = (t - 4.5)^2 * 1.8.
2.3 THE space set (x = -3000) SHALL show the Earth's curve with a thin blue limb, a black sky and stars. At staging the spent first stage SHALL fall away tumbling while the second stage lights.
2.4 THE TLI view SHALL show the third stage and spacecraft burning over the Earth with a bright engine glow.
2.5 THE sets SHALL be drawn only while a shot looks at them.

## 3. Start

3.1 ON start THE Player SHALL be seated, ambience hum 0.6, fear 0.05, heart rate 84, sky #9db7c9, DSKY showing PROG 01 with COMP ACTY on.

## 4. Launch timeline (16 s)

4.1 THE shots SHALL be: 0 to 3.3 s the pad from far away (fov 55, slowly moving), 5.2 to 8.6 s low beside the pad looking up (fov 75), 10 to 12.6 s space at staging (fov 60). Between shots the cabin SHALL show.
4.2 THE shake in metres SHALL be 0 until 3 s, 0.05 at 4 s, 0.035 at 9 s, 0.09 at 10 s, 0.02 at 11 s, 0 at 15 s.
4.3 THE events SHALL be: 0.5 s `act1.count`; 3.2 s `rumble`; 4.5 s `act1.liftoff`; 5.2 s `launchRoar`; 7 s sky #4a6a8a; 9 s sky #1a2636; 9.8 s `alarm`; 10 s `staging` and `act1.staging` with the view on the overhead window; 13 s sky black; 14.5 s `act1.o2` with the view on the O2 gauge.
4.4 THE engine level SHALL be 0 until 3.5 s, rise to 1 by 9.5 s, be 0.3 from 10 to 11 s, then fall. THE master alarm SHALL flash from 9.8 to 11.6 s.

## 5. Stages

5.1 THE stages SHALL run launch, switch, keyin, tli, done, each once, in order.
5.2 WHEN the launch ends, THE commander SHALL say `act1.switch` with the view on the switch, the objective SHALL become `act1Switch` and the `use` hint SHALL show. THE red switch (FLIP, radius 0.12, marker target) SHALL be enabled only in the switch stage.
5.3 WHEN the switch is flipped, THE `switch` sound SHALL play, the objective SHALL become `act1Key`, the commander SHALL say `act1.key` with the view on the DSKY, and KEY REL SHALL light.
5.4 THE DSKY (KEY IN, radius 0.16) SHALL be enabled only in the keyin stage. Each press SHALL play `key`. Press 1 SHALL show VERB 37. Press 2 SHALL show PROG 15, VERB 06, NOUN 33, registers +00002, +00044, +01600. Press 3 SHALL show PROG 15, VERB 16, NOUN 95, registers +10421, +00003, +00000, and clear the objective.
5.5 THE `o2-for-four` anomaly SHALL be a sighting on the O2 gauge (radius 0.15).

## 6. TLI

6.1 AFTER press 3, CAPCOM SHALL say `act1.tli`, then a 15 s timeline SHALL play one shot from 0.4 to 5.6 s of the third stage burning over the Earth.
6.2 THE TLI events SHALL be: rumble at 0.2 s, shake 0.03 until 6 s and 0 at 7 s, the Earth in the windows at 6.5 s, Mike saying `act1.earth` at 7.2 s with the view on the window, then the commander saying `act1.moon`.
6.3 THEN CAPCOM SHALL say `act1.rest`, then THE act SHALL call `completeAct()`.

## 7. Content and budget

7.1 THE subtitles `act1.count` (4 s), `act1.liftoff` (shout, 3 s), `act1.staging`, `act1.o2`, `act1.switch`, `act1.key`, `act1.tli`, `act1.earth`, `act1.moon`, `act1.rest` and the checklists `act1Switch` (target `act1:switch`) and `act1Key` (target `act1:dsky`) SHALL be added with the text from the brief.
7.2 THE cabin and each outside shot SHALL stay under 150 draw calls and 150k triangles.

# Requirements: act5-home

The last chapter: re-entry, radio blackout, drogue and main chutes, splashdown, recovery, then the Archive.
Mostly a cutscene. The player sits in the act 1 cabin and can look around between outside shots.

## 1. Cabin and outside sets
1.1 The act shall reuse the act 1 cabin, console and crew through a shared module, with no import from another act.
1.2 While a shot is active, the system shall draw only the set that shot looks at: entry set (x = -5000) or ocean set (x = 5000). Between shots it shall draw the cabin.
1.3 The entry set shall show the Earth's curve with clouds and a bright limb, a starry sky, and the command module tilted nose back, with a plasma bubble and a puff trail that both scale with `heat`.
1.4 The ocean set shall show an animated low-poly ocean, a hazy sky, the capsule under two drogues then three mains (12 gores, many lines), and after splashdown a splash, a foam ring and an orange collar.
1.5 The ocean set shall show USS Hornet at offset (420, -760), a destroyer on x -38, and a Sea King with "NAVY" and "66" on its side and a spinning five-blade rotor.

## 2. Timeline (72 s)
2.1 The act shall start with fear 0.2, heart rate 100, tension UNEASE, hum 0.5 and the Earth in the windows over black.
2.2 The shots, shake keys, heat curve and capsule height shall follow the prompt exactly (design.md lists them).
2.3 Each event shall fire once, in time order, with the sound, line and view focus given in design.md.
2.4 The destroyer shall move along x -38 from z 330 at 6 m/s from 31 s. The helicopter shall ease from the carrier to the hover offset (9, 11, 4) between 46 s and 58 s.
2.5 Ocean sound shall play only after 31 s, at full volume while a shot is outside and 0.35 in the cabin after splashdown. Helicopter sound shall rise with its approach, full outside and 0.3 inside.
2.6 When the player quits to title mid-timeline, no further event shall fire and all sound shall stop.

## 3. Content
3.1 The seven lines (`act5.entry` to `act5.end`) shall exist in `src/content/subtitles.ts`, `act5.end` voiced.

## 4. Ending
4.1 At 69.5 s the screen shall fade to black over 2 s, then `completeAct()` shall show the Archive and mark the game finished.
4.2 All six anomalies shall be noticeable in one full run.

## 5. Tests
5.1 Unit tests cover the height, heat, mains, splash formulas, event order and single firing, and the helicopter ease ends.
5.2 `e2e/act5.mjs` plays the act with screenshots every 9 s. `e2e/playthrough.mjs` plays the whole game to the Archive.

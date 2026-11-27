# Requirements: sharp-view

The 3D view looks blurry in the game window on a 1800 to 1900 px wide screen. The cause is two things. The default internal resolution is 640x360, stretched about 3 times. The adaptive scaler drops a level after 2 s above 20 ms and only climbs after 5 s under 12 ms, which a 60 Hz display (16.7 ms frames) never reaches, so one slow stretch lowers the picture for the rest of the run.

## 1. Scaler

1.1 WHEN the mean frame time over 5 s is under the climb threshold, THE scaler SHALL go up one level. The threshold is the measured display frame time plus 5 %, limited to 7 to 17.5 ms.
1.2 WHEN the mean frame time over 3 s is above 25 ms, THE scaler SHALL go down one level.
1.3 THE scaler SHALL NOT count paused time, loading, act changes, chapter cards or the first 3 s after a camera cut or a resume.
1.4 THE scaler SHALL NOT go below 640x360 by itself, except in the Retro setting, whose range includes 480x270 and 320x180.
1.5 AFTER a drop, THE scaler SHALL NOT climb for 30 s.

## 2. Levels and default

2.1 THE level table SHALL be 1920x1080, 1280x720, 960x540, 640x360, 480x270, 320x180.
2.2 THE start level SHALL be the highest level whose width fits the game view in real pixels (CSS width times `devicePixelRatio`), not above 1280x720 unless the Sharp ceiling allows 1920x1080.
2.3 THE snap grid and the dither SHALL follow the internal resolution, so they get finer as the picture gets sharper.
2.4 THE canvas SHALL stay `image-rendering: pixelated`.

## 3. Setting

3.1 THE settings SHALL have "Picture" with Sharp (default), Balanced and Retro, saved with the other settings.
3.2 Sharp SHALL start at the level of 2.2 and may climb to 1920x1080 when the view fits it and the frame rate holds.
3.3 Balanced SHALL start at 960x540 and Retro at 640x360.
3.4 THE scaler SHALL stay inside the range of the chosen setting. Changing the setting SHALL apply at once.

## 4. Checks

4.1 Unit tests for the decision, the level table, the ranges and the setting.
4.2 Lint, build, budget check, e2e `render`, `act1`, `act5`, `window`.
4.3 Screenshots of act 0 and act 1 in the game window at 1600x900 for each setting, and frame times.

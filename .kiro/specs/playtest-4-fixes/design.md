# Design: playtest 4 fixes

1. `PANEL_AHEAD` (1.08 m) in `procgen/cabin/layout.ts` replaces 0.7. The spots move with the panel. Reach stays at 2.5 m, enough for the DSKY at about 1.2 m. The layout test projects the four corners with a 60 degree, 16:9 camera at the start pitch.
2. A pure `entrySound.ts` in act 5 maps shot time to levels (rumble, roar, crackle, muffle) from the glow curve in `entryFx.ts`. The runtime applies the levels each frame to looping synth voices from the audio engine.
3. Lines become `LineSegments` (one pixel, transparent). Counts, confluence height and drogue proportions are pure data in `chutes.ts`.
4. The subtitle shows the full line with the unrevealed letters transparent (same layout), so the text stays put.

Task 4 note: the cause was the vertical line-clamp box, which made the typed and the hidden spans two separate centred blocks. Both are now one inline span. There is no DOM test environment, so this has no unit test.

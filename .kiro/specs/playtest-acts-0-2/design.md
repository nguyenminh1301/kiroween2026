# Design: playtest fixes, acts 0 to 2

Decisions:
- Verb `TALK` (label TALK) added to the shared verb list.
- Act 0 beats become pure talk handlers. The wave objective shows when the second narrator line ends. The walkway crew say `act0.pad1` before the wave and `act0.pad2` after. Gunter says `act0.pad3` and marks the anomaly.
- Escape tower is built in `procgen/escapeTower.ts` from thin bars, merged into two geometries (white, dark).
- Shake is a pure function in `act1-launch/shake.ts` (envelope, noise, caps) tested for the caps.
- Plume: pure `plume.ts` gives per-frame length, trench fraction and flicker. `outside.tsx` renders five additive cones plus glow sprites. Steam clouds scale with trench fraction.
- Windows: `procgen/cabin/windows.ts` lays five quads flush on the shell faces and gives every texel its direction from the eye. `windowView.ts` paints by that direction (stars, Earth disc, sea horizon), so all windows share one world. The quad is the clip shape, so nothing leaves the opening. I chose this over a stencil because the render pipeline has no stencil buffer today and the change could not be checked on screen here.
- Act 2 repairs are three small state machines in `repairs.ts`; the old breaker, pen and flash logic goes. Bedtime lives in `sleepTimer.ts` (fade 2 s, four breathing rhythms, six second notice).
- UI wrapping is CSS: `max-width: 90vw`, `-webkit-line-clamp: 3`, font size with `clamp()` and `vw`.
- New lines have no audio file, so they play as subtitles with the speaker filter on silence.

Unclear points: where the hammer, gauge and screen sit is chosen from the existing layout (command module, tunnel mouth, lander). The `TALK` label is upper case like the other verbs.

# Design

## Photo
- `PHOTO_SPOT` moves from (0.2, 9.4) to (1.7, 9.4), 3.2 m from the flag at (-1.5, 9). Neil's stand point stays in front of the pair.
- Photo interactable uses `aim`: true when the eye is within the ring (radius 1.0 m) and the ray hits a sphere around the flag. Pure helper `photoAim` in `layout.ts` is unit tested.
- `canTake` refuses scoop and seismometer until `photoDone`. Their kits stay targetable, and `use` shows hint `locked` when refused. Objective text lists only the flag and photo until the photo is done.
- Decision: the flag kit is still free first. Sample and seismometer follow the photo.

## Re-entry
Rebuild `entry.tsx` shot from layered additive cones: shell, inner core, wake cones, spark points. Pure `glowAt(t)` curve (build, peak, fade) in a plain file with a test if none exists.

## Chutes
`chutes.ts` returns canopy centres, tilt, line apex and riser ends. Triangle layout around the vertical axis, apex per canopy a few metres over the capsule. Tests assert triangle, tilt outward, every riser ends at the capsule top.

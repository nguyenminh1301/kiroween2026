# Requirements Document

## Introduction

This spec gives LOSS OF SIGNAL its PS1-era look and keeps the frame rate up. It adds low-resolution rendering with a pixelated upscale, adaptive resolution, one post-processing pass (chromatic fringing, vignette, film grain, 6-bit colour with ordered dither), vertex snapping, fog, a material factory, procedural canvas textures, and debug stats. It applies all of this to the `sandbox` act from `engine-core`, so the sandbox looks like the reference shots in `docs/reference/shots/` (grainy, pixelated, dithered, with wobbly vertices up close). The green box in those shots is the debug stats overlay.

This spec supersedes `engine-core` requirement 19.11 (the Sandbox uses plain colours and no PS1 look). From this spec on, the Sandbox uses the material factory and the procedural textures. It adds no menus, audio or real acts.

Pure logic (adaptive resolution, fear mapping, Bayer and gamma maths, seeded random numbers, texture pixel generation, snap maths) lives in plain `.ts` files with no Three.js or React import, so it can be unit and property tested. The game loop never goes through React state. Procedural textures, the adaptive scaler and the stats box write to refs or the vanilla Store, and React renders only the stats box overlay.

## Glossary

- **Renderer_Module**: The set of modules under `src/render/` and `src/procgen/` that this spec adds.
- **Internal_Resolution**: The width and height in pixels of the drawing buffer the 3D scene is rendered into.
- **Resolution_Level**: An integer index into the Level_Table. Level 0 is the highest resolution.
- **Level_Table**: The list `[960x540, 640x360, 480x270, 320x180]`, indexed 0 to 3.
- **Game_View**: The 16:9 area of the window in which the canvas is shown.
- **Letterbox**: The black area around the Game_View when the window is not 16:9.
- **Upscale**: The CSS scaling of the small canvas to the Game_View with `image-rendering: pixelated`.
- **Frame_Sample**: The time in milliseconds of one rendered frame that ran while the game was not paused.
- **Sample_Buffer**: The rolling list of up to 600 Frame_Samples, newest last.
- **Adaptive_Scaler**: The runtime that runs `nextLevel` every 500 ms on the Sample_Buffer and changes the Resolution_Level.
- **Level_Decision**: The pure function `nextLevel(level, samplesMs, msSinceChange)` that returns the next Resolution_Level.
- **Window_Mean**: The mean of the most recent Frame_Samples that together cover a given span of milliseconds, taken by adding samples from the newest backwards until their sum is at least the span.
- **Down_Window**: The 2000 ms span used to decide a step down.
- **Up_Window**: The 5000 ms span used to decide a step up.
- **Settle_Time**: The 3000 ms after a level change during which the level is kept.
- **PS1_Effect**: The single `postprocessing` Effect that applies fringing, vignette, grain, colour depth and dither in its fragment shader.
- **Fear**: The Store field `fear`, a number from 0 to 1 with default 0.
- **Look_Params**: The triple `{ vignette, fringe, noise }` derived from Fear and the reduced motion setting.
- **Bayer4**: The 4x4 ordered dither matrix with values 0 to 15 mapped to the range 0 to 1 (value `(m + 0.5) / 16`).
- **Snap_Patch**: The helper that patches a three.js material through `onBeforeCompile` so that vertices snap to the internal pixel grid.
- **Material_Factory**: The only function through which acts create materials.
- **Fog_Spec**: The triple `{ color, near, far }` that one act sets for its scene fog.
- **Procedural_Texture**: A texture drawn at load time from a seeded random number generator.
- **Seeded_RNG**: A deterministic random number generator that returns the same sequence for the same seed.
- **Texture_Name**: One of `metalPanel`, `whitePanel`, `rust`, `gratingPlate`, `instrumentPanel`, `regolith`.
- **Pixel_Data**: The RGBA byte array of a Procedural_Texture.
- **Texture_Cache**: The map that stores each texture by the pair of Texture_Name and seed.
- **Stats**: The object `window.__los.stats` with `frameMs`, `calls`, `triangles`, `internalWidth`, `internalHeight` and `level`.
- **Stats_Box**: The small dark overlay at the top left that shows Stats when the URL has `?debug`.
- **Debug_Contract**: The `window.__los` object described in `testing.md`, set only when the URL has `?debug`.
- **Render_E2E**: The script `e2e/render.mjs`.
- **Sandbox**: The dev-only act with id `sandbox` from `engine-core`.

## Requirements

### Requirement 1: Low-resolution drawing buffer

**User Story:** As a player, I want the game drawn at a small resolution and scaled up with hard pixels, so that it looks like a PS1 game and costs little to render.

#### Acceptance Criteria

1. THE Renderer_Module SHALL render the 3D scene into a drawing buffer whose width and height equal the Internal_Resolution of the current Resolution_Level.
2. THE Renderer_Module SHALL define the Level_Table as `[960x540, 640x360, 480x270, 320x180]`.
3. WHEN the app starts, THE Renderer_Module SHALL select Resolution_Level 1 (640x360).
4. THE Renderer_Module SHALL set the canvas CSS `image-rendering` to `pixelated`.
5. THE Renderer_Module SHALL run the PS1_Effect on the small drawing buffer and SHALL NOT render any pass at the CSS size.
6. THE Renderer_Module SHALL set the R3F device pixel ratio so that the canvas drawing buffer is exactly the Internal_Resolution for any Game_View size.
7. WHEN the Resolution_Level changes, THE Renderer_Module SHALL resize the drawing buffer to the new Internal_Resolution within one rendered frame.
8. WHEN the Game_View changes size, THE Renderer_Module SHALL keep the drawing buffer at the Internal_Resolution and SHALL NOT change the Resolution_Level.
9. THE Level_Table lookup function SHALL return a width and height for every integer level from 0 to 3, and every returned pair SHALL have a 16:9 ratio.
10. THE canvas background SHALL be black where no act is loaded.

### Requirement 2: Game view and letterbox

**User Story:** As a player, I want the picture to stay 16:9 in any window, so that the image is never stretched.

#### Acceptance Criteria

1. THE Game_View SHALL have an aspect ratio of 16:9.
2. THE Game_View SHALL be the largest 16:9 rectangle that fits inside the window, centred in the window.
3. WHEN the window has a ratio other than 16:9, THE Renderer_Module SHALL fill the remaining area with black.
4. WHEN the window is resized, THE Renderer_Module SHALL recompute the Game_View within one rendered frame.
5. WHEN the window is 1280x720, THE canvas CSS size SHALL be 1280x720.
6. THE Game_View size function SHALL be a pure function of the window width and height.
7. FOR ALL window sizes with positive width and height, THE Game_View SHALL fit inside the window and SHALL have a width to height ratio within 0.01 of 16:9 (invariant property).
8. FOR ALL window sizes, THE Game_View SHALL touch at least one pair of opposite window edges, so that no larger 16:9 rectangle fits (invariant property).
9. IF the window width or height is zero, THEN THE Game_View size function SHALL return a zero-size view and SHALL NOT throw.

### Requirement 3: Adaptive resolution decision

**User Story:** As a player on a weak laptop, I want the game to lower its resolution when it is slow and raise it when there is room, so that the frame rate holds without constant flicker.

#### Acceptance Criteria

1. THE Level_Decision SHALL be a pure function in a plain `.ts` file with no Three.js or React import.
2. WHEN `msSinceChange` is less than 3000, THE Level_Decision SHALL return the level it was given.
3. WHEN the Frame_Samples sum to less than the Down_Window, THE Level_Decision SHALL skip the step-down rule.
4. WHEN the Frame_Samples sum to at least the Down_Window and the Window_Mean over the Down_Window is over 20 ms and a lower resolution exists, THE Level_Decision SHALL return the given level plus one.
5. WHEN the step-down rule does not apply and the Frame_Samples sum to at least the Up_Window and the Window_Mean over the Up_Window is under 12 ms and a higher resolution exists, THE Level_Decision SHALL return the given level minus one.
6. WHEN the Frame_Samples sum to less than the Up_Window, THE Level_Decision SHALL skip the step-up rule.
7. WHEN the level is already 3 and the step-down rule would apply, THE Level_Decision SHALL return 3.
8. WHEN the level is already 0 and the step-up rule would apply, THE Level_Decision SHALL return 0.
9. THE Level_Decision SHALL change the level by at most one step per call.
10. WHEN the Window_Mean is exactly 20 ms or exactly 12 ms, THE Level_Decision SHALL keep the level.
11. IF `samplesMs` is empty, THEN THE Level_Decision SHALL return the given level.
12. THE Level_Decision SHALL ignore Frame_Samples that are not finite numbers or are negative, and SHALL NOT throw.
13. FOR ALL inputs, THE Level_Decision result SHALL be an integer from 0 to 3 whose difference from the given level is -1, 0 or 1 (invariant property).
14. A simulation of steady 30 ms frames from level 0 SHALL step down once every 3 s until level 3 and then stay at level 3.
15. A simulation of steady 8 ms frames from level 3 SHALL step up until level 0 and then stay at level 0.
16. A simulation of a single 200 ms frame inside otherwise 10 ms frames SHALL NOT cause a step down.
17. A simulation of alternating one-second runs of 30 ms frames and 8 ms frames SHALL NOT change the level more than once in any 3000 ms span.

### Requirement 4: Adaptive resolution runtime

**User Story:** As a player, I want the scaler to measure only real play time, so that pausing or alt-tabbing never lowers my resolution.

#### Acceptance Criteria

1. WHEN a frame is rendered while the game is not paused, THE Adaptive_Scaler SHALL append its time as a Frame_Sample to the Sample_Buffer.
2. WHILE the game is paused, THE Adaptive_Scaler SHALL NOT record Frame_Samples.
3. THE Sample_Buffer SHALL hold at most 600 Frame_Samples and SHALL drop the oldest sample when a new sample would exceed that count.
4. THE Adaptive_Scaler SHALL run the Level_Decision once every 500 ms of unpaused time.
5. WHEN the Level_Decision returns a level different from the current level, THE Adaptive_Scaler SHALL set the new Resolution_Level and clear the Sample_Buffer.
6. WHEN the Resolution_Level changes for any reason, THE Adaptive_Scaler SHALL set `msSinceChange` to zero.
7. WHILE the game is paused, THE Adaptive_Scaler SHALL NOT advance `msSinceChange` or the 500 ms decision timer.
8. WHEN a Frame_Sample is not a finite number or exceeds 1000 ms, THE Adaptive_Scaler SHALL discard it.
9. WHEN `render.auto(false)` has been called, THE Adaptive_Scaler SHALL NOT change the Resolution_Level, and SHALL NOT run the Level_Decision.
10. WHEN `render.auto(true)` is called, THE Adaptive_Scaler SHALL clear the Sample_Buffer and set `msSinceChange` to zero.
11. THE Adaptive_Scaler SHALL register its frame callback through the engine's registration helper, so that its cleanup runs when an act unloads.
12. THE Adaptive_Scaler SHALL keep the Resolution_Level across act loads and unloads.

### Requirement 5: Fear mapping

**User Story:** As a gameplay developer, I want one store value that drives how hard the image degrades, so that act 3 can raise the dread without touching the shader.

#### Acceptance Criteria

1. THE Store SHALL hold a field `fear` with default 0 and a setter that clamps its input to the range 0 to 1.
2. WHEN the `fear` setter receives a value that is not a finite number, THE Store SHALL keep the previous value.
3. THE Look_Params function SHALL be a pure function of Fear and the reduced motion flag, in a plain `.ts` file with no Three.js or React import.
4. THE Look_Params function SHALL return `vignette = 0.25 + 0.75 * fear`, `fringe = fear` and `noise = 0.2 + 0.8 * fear`.
5. WHERE `settings.reducedMotion` is true, THE Look_Params function SHALL halve `fringe` and `noise` after applying the formulas in criterion 4.
6. WHERE `settings.reducedMotion` is true, THE Look_Params function SHALL leave `vignette` at its formula value.
7. WHEN Fear is 0, THE Look_Params function SHALL return `vignette` 0.25 and `noise` 0.2, so that a floor of grain and vignette is always present.
8. IF the Look_Params function receives a Fear outside 0 to 1 or not finite, THEN THE Look_Params function SHALL clamp it into 0 to 1 first, treating a non-finite value as 0.
9. FOR ALL Fear values from 0 to 1, THE Look_Params function SHALL return `vignette` from 0.25 to 1, `noise` from 0.2 to 1 and `fringe` from 0 to 1 (invariant property).
10. FOR ALL Fear values, THE Look_Params `vignette` and `noise` SHALL be non-decreasing as Fear grows (metamorphic property).
11. THE PS1_Effect SHALL read Fear and the reduced motion flag from the Store with `getState()` once per frame, and SHALL NOT cause a React state update per frame.

### Requirement 6: PS1 post-processing pass

**User Story:** As a player, I want a grainy, dithered, slightly warped image, so that the game looks like a PS1 game running on a bad display.

#### Acceptance Criteria

1. THE Renderer_Module SHALL apply the look through one PS1_Effect that runs in one fragment shader pass.
2. THE PS1_Effect SHALL apply its steps in this order: chromatic fringing, vignette, conversion to gamma space, film grain, 6-bit quantization with ordered dither, and conversion back to linear.
3. THE PS1_Effect SHALL apply chromatic fringing by sampling red at `uv - offset` and blue at `uv + offset`, with green sampled at `uv` and `offset = (uv - 0.5) * fringe * 0.012`.
4. THE PS1_Effect SHALL apply the vignette as `color *= clamp(1 - dot(v, v) * vignette * 0.55, 0, 1)`, with `v = uv * 2 - 1`.
5. THE PS1_Effect SHALL convert the colour to gamma space with `pow(c, 1 / 2.2)` before the film grain step.
6. THE PS1_Effect SHALL add film grain in gamma space with amplitude `noise * 0.03`, using a random value per internal pixel.
7. THE PS1_Effect SHALL re-seed the film grain 24 times per second, from the Game_Time, and SHALL keep the same grain pattern between re-seeds.
8. THE PS1_Effect SHALL quantize each channel in gamma space as `floor(g * 63 + bayer4(px)) / 63`, where `px` is the internal pixel coordinate.
9. THE PS1_Effect SHALL convert the quantized colour back to linear space with `pow(c, 2.2)`.
10. WHEN the Resolution_Level changes, THE PS1_Effect SHALL use the new Internal_Resolution for `px` from the next frame on.
11. THE Bayer4 function SHALL be a pure function of integer pixel coordinates, in a plain `.ts` file mirroring the shader, with a period of 4 in both axes.
12. FOR ALL integer pixel coordinates, THE Bayer4 value SHALL be at least 0 and below 1 (invariant property).
13. THE Bayer4 values over one 4x4 tile SHALL be 16 distinct values (invariant property).
14. THE quantize function in the plain `.ts` mirror SHALL return, for every channel value from 0 to 1 and every pixel, a value from 0 to 1 that is a multiple of 1/63 (invariant property).
15. FOR ALL channel values from 0 to 1, THE quantize function SHALL return a value within 1/63 of the input (metamorphic property).
16. THE PS1_Effect SHALL read Look_Params every frame, so that a change of Fear shows within one rendered frame.
17. WHEN the shader fails to compile, THE Renderer_Module SHALL log the error once and SHALL continue to render the scene without the PS1_Effect.

### Requirement 7: Vertex snapping

**User Story:** As a player, I want geometry to wobble a little when I get close, so that the game has the PS1 vertex jitter.

#### Acceptance Criteria

1. THE Snap_Patch SHALL patch a three.js material through `onBeforeCompile`.
2. THE Snap_Patch SHALL, in the vertex shader after projection, divide `gl_Position.xy` by `gl_Position.w`, snap it as `floor(xy * res * 0.5 + 0.5) / (res * 0.5)`, and multiply by `w` again, where `res` is the internal resolution.
3. THE Snap_Patch SHALL leave `gl_Position.z` and `gl_Position.w` unchanged.
4. THE Snap_Patch SHALL give each Resolution_Level its own program cache key, so that three.js keeps one program per level.
5. WHEN the Resolution_Level changes, THE Snap_Patch SHALL update the snap resolution of every patched material before the next frame renders.
6. WHEN a patched material is disposed, THE Snap_Patch SHALL remove the material from its list of patched materials.
7. THE snap function SHALL be a pure function in a plain `.ts` file that mirrors the shader maths.
8. FOR ALL clip-space x and y values from -1 to 1 and every level, THE snap function SHALL return a value on the grid of `1 / (res * 0.5)` steps (invariant property).
9. FOR ALL values, applying the snap function twice SHALL give the same result as applying it once (idempotence property).
10. FOR ALL values, THE snap function result SHALL differ from the input by less than `1 / (res * 0.5)` (metamorphic property).
11. WHEN `w` is not positive, THE Snap_Patch SHALL leave the vertex position unchanged, so that vertices behind the camera do not produce invalid values.

### Requirement 8: Material factory

**User Story:** As an act author, I want one function that makes game materials, so that every surface has the same look and acts cannot bypass it.

#### Acceptance Criteria

1. THE Material_Factory SHALL create either an unlit material (`MeshBasicMaterial`) or a Lambert material (`MeshLambertMaterial`).
2. THE Material_Factory SHALL accept options for the kind, the base colour, a texture, vertex colours (for baked lighting), vertex snapping, and fog.
3. WHERE vertex snapping is on, THE Material_Factory SHALL apply the Snap_Patch to the created material.
4. WHEN no option sets vertex snapping, THE Material_Factory SHALL turn vertex snapping on.
5. WHERE vertex colours are on, THE Material_Factory SHALL set the material to use vertex colours.
6. WHERE a texture is passed, THE Material_Factory SHALL set the texture to nearest magnification and nearest minification filtering, with mipmaps off, and `generateMipmaps` false.
7. WHERE a texture is passed, THE Material_Factory SHALL set the texture wrapping to repeat and the colour space to sRGB.
8. THE Material_Factory SHALL set fog to on unless the options turn it off.
9. THE Material_Factory SHALL NOT create any other material class.
10. THE Sandbox SHALL create every material through the Material_Factory.
11. THE Material_Factory SHALL NOT enable per-pixel lights beyond the Lambert material, and SHALL NOT enable shadows.
12. WHEN the same options are passed twice, THE Material_Factory SHALL return two separate material objects that share the same cached textures.
13. THE factory option normalizer SHALL be a pure function in a plain `.ts` file that fills defaults, with no Three.js import.
14. FOR ALL option objects, THE option normalizer SHALL return an object with `kind`, `snap` and `fog` set, and applying the normalizer to its own result SHALL return an equal object (idempotence property).

### Requirement 9: Fog

**User Story:** As an act author, I want to set fog for my act, so that each place has its own distance and mood.

#### Acceptance Criteria

1. THE Renderer_Module SHALL provide a function that applies a Fog_Spec to the scene as linear fog.
2. WHEN an act applies a Fog_Spec, THE Renderer_Module SHALL set the scene fog colour, near and far to its values.
3. WHEN an act applies a Fog_Spec, THE Renderer_Module SHALL set the canvas clear colour to the Fog_Spec colour.
4. WHEN an act unloads, THE Renderer_Module SHALL remove its fog and reset the clear colour to black.
5. THE Sandbox SHALL apply a dark grey fog with `near` 6 m and `far` 25 m.
6. IF a Fog_Spec has `near` greater than or equal to `far`, or either value is negative or not finite, THEN THE Renderer_Module SHALL reject it, keep the earlier fog, and log the error once.
7. THE Fog_Spec validator SHALL be a pure function in a plain `.ts` file with no Three.js import.
8. FOR ALL Fog_Specs with `0 <= near < far`, THE validator SHALL accept the spec (invariant property).
9. FOR ALL Fog_Specs with `near >= far`, THE validator SHALL reject the spec (invariant property).

### Requirement 10: Seeded random numbers

**User Story:** As a gameplay developer, I want textures that are the same every run, so that screenshots and tests are repeatable.

#### Acceptance Criteria

1. THE Seeded_RNG SHALL be a pure function of an integer seed, in a plain `.ts` file with no Three.js, React or DOM import.
2. THE Seeded_RNG SHALL return numbers from 0 (inclusive) to 1 (exclusive).
3. FOR ALL seeds, two Seeded_RNG instances made from the same seed SHALL return the same sequence of the first 1000 numbers (determinism property).
4. FOR ALL pairs of different seeds, THE first 16 numbers of the two sequences SHALL NOT all be equal (metamorphic property).
5. THE Seeded_RNG SHALL NOT call `Math.random`.
6. WHEN a seed is not an integer, THE Seeded_RNG SHALL convert it to a 32-bit integer without throwing.

### Requirement 11: Procedural texture drawing

**User Story:** As an art-side developer, I want textures drawn in code with no image files, so that the game stays small and the look is consistent.

#### Acceptance Criteria

1. THE Renderer_Module SHALL provide these Texture_Names: `metalPanel`, `whitePanel`, `rust`, `gratingPlate`, `instrumentPanel`, `regolith`.
2. THE `metalPanel` texture SHALL draw a painted metal panel with rivets.
3. THE `whitePanel` texture SHALL draw a clean white panel with an orange stripe.
4. THE `rust` texture SHALL draw rust with blotches and grime.
5. THE `gratingPlate` texture SHALL draw a grating or floor plate.
6. THE `instrumentPanel` texture SHALL draw a beige instrument panel with small dials.
7. THE `regolith` texture SHALL draw lunar regolith noise.
8. THE texture drawing code SHALL produce Pixel_Data as a pure function of the Texture_Name and the seed, in plain `.ts` files that import neither Three.js, React nor any DOM or canvas API.
9. THE texture drawing code SHALL use only the Seeded_RNG as its source of randomness.
10. THE tile size of every texture SHALL be 128 px by 128 px.
11. THE size of any texture SHALL NOT exceed 256 px in width or in height.
12. FOR ALL Texture_Names and seeds, two calls with the same Texture_Name and seed SHALL return identical Pixel_Data (determinism property).
13. FOR ALL Texture_Names, THE Pixel_Data length SHALL equal `width * height * 4` (invariant property).
14. FOR ALL Texture_Names, calls with two different seeds SHALL return Pixel_Data that differs in at least one pixel.
15. FOR ALL Texture_Names and seeds, every Pixel_Data alpha byte SHALL be 255 (invariant property).
16. FOR ALL Texture_Names, THE Pixel_Data SHALL contain at least 8 distinct colours, so that no texture is flat.
17. THE palettes of the textures SHALL come from the palettes in `art.md` for the acts that use them.
18. WHEN a texture is requested with a name that is not a Texture_Name, THE texture function SHALL throw a descriptive error.
19. WHERE the Pixel_Data is tiled in both directions, THE seam between neighbouring tiles SHALL be continuous: the mean absolute difference between the last and the first row, and between the last and the first column, SHALL be at most twice the mean absolute difference between adjacent rows and columns inside the tile.

### Requirement 12: Texture upload and cache

**User Story:** As a gameplay developer, I want each texture built once, so that loading is fast and memory stays low.

#### Acceptance Criteria

1. WHEN a texture is requested in the browser, THE Renderer_Module SHALL write the Pixel_Data to a canvas and create a three.js texture from it.
2. THE Renderer_Module SHALL cache each texture by the pair of Texture_Name and seed in the Texture_Cache.
3. WHEN the same Texture_Name and seed are requested again, THE Renderer_Module SHALL return the same texture object and SHALL NOT draw again.
4. WHEN the same Texture_Name is requested with a different seed, THE Renderer_Module SHALL draw and cache a separate texture.
5. THE cache key function SHALL be a pure function of the Texture_Name and the seed, and two different pairs SHALL give two different keys (invariant property).
6. WHEN an act unloads, THE Renderer_Module SHALL keep the Texture_Cache.
7. THE Renderer_Module SHALL provide a function that disposes every cached texture and empties the Texture_Cache, for tests.
8. IF the browser cannot create a 2D canvas context, THEN THE Renderer_Module SHALL create a data texture from the Pixel_Data and SHALL NOT throw.
9. THE textures SHALL NOT be loaded from files, and THE build SHALL contain no image asset for them.
10. THE total texture memory of the Sandbox SHALL NOT exceed 2 MB.

### Requirement 13: Sandbox retexture

**User Story:** As a developer, I want the sandbox to look like the reference shots, so that I can judge the look before real acts exist.

#### Acceptance Criteria

1. THE Sandbox SHALL use the Material_Factory for every mesh material.
2. THE Sandbox SHALL use at least four different Procedural_Textures, chosen from the Texture_Names.
3. THE Sandbox SHALL apply a dark grey Fog_Spec with `near` 6 m and `far` 25 m.
4. THE Sandbox SHALL keep its existing collision Boxes, ground function, zero-g zone and seat unchanged, so that the `engine-core` end-to-end checks still pass.
5. THE Sandbox SHALL stay within these per-scene budgets: under 150 draw calls, under 150000 triangles, textures 256 px at most, and one dynamic light at most.
6. WHERE the Sandbox shows repeated props, THE Sandbox SHALL draw them with instancing.
7. THE Sandbox SHALL contain no player-facing text.
8. WHEN the Sandbox is loaded with `?debug`, THE rendered frame SHALL show the PS1 look: visible pixel blocks, visible dither pattern and a darkened edge.
9. THE Renderer_Module SHALL apply the PS1_Effect and the low-resolution rendering to the whole app canvas, so that later acts need no setup beyond the Material_Factory and a Fog_Spec.

### Requirement 14: Debug stats

**User Story:** As a developer, I want live performance numbers on screen and in the Debug_Contract, so that I can watch the budgets and test them.

#### Acceptance Criteria

1. WHERE the URL has `?debug`, THE app SHALL set `window.__los.stats` with the fields `frameMs`, `calls`, `triangles`, `internalWidth`, `internalHeight` and `level`.
2. THE `frameMs` field SHALL be a smoothed frame time in milliseconds, computed as an exponential moving average of the Frame_Samples.
3. THE `calls` field SHALL equal the draw call count of the renderer for the last rendered frame, including the post-processing pass.
4. THE `triangles` field SHALL equal the triangle count of the renderer for the last rendered frame.
5. THE `internalWidth` and `internalHeight` fields SHALL equal the drawing buffer size of the canvas.
6. THE `level` field SHALL equal the current Resolution_Level.
7. THE `window.__los.stats` object SHALL read its values live, so that each read returns the latest numbers.
8. THE app SHALL keep the existing `version` field and SHALL NOT rename any Debug_Contract field.
9. WHERE the URL has `?debug`, THE app SHALL set `window.__los.render` with `setLevel(n)` and `auto(on)`.
10. WHEN `render.setLevel(n)` is called with an integer from 0 to 3, THE Adaptive_Scaler SHALL set the Resolution_Level to n and reset `msSinceChange` to zero.
11. IF `render.setLevel(n)` is called with a value that is not an integer from 0 to 3, THEN THE Adaptive_Scaler SHALL keep the current level and SHALL NOT throw.
12. WHEN `render.auto(on)` is called, THE Adaptive_Scaler SHALL switch automatic scaling on if `on` is true and off otherwise.
13. WHERE the URL has `?debug`, THE app SHALL show the Stats_Box at the top left of the window.
14. THE Stats_Box SHALL show the frame time in milliseconds, the draw calls, the triangles and the internal resolution, in green monospace text on a dark box.
15. THE Stats_Box SHALL update at most 4 times per second.
16. WHERE the URL has no `?debug`, THE app SHALL NOT show the Stats_Box and SHALL NOT define `window.__los`.
17. THE Stats_Box SHALL NOT take pointer events, so that it never blocks clicks on the canvas.
18. THE Stats_Box text SHALL sit in a debug module and SHALL NOT be part of the player-facing content in `src/content/`.
19. THE stats smoothing function SHALL be a pure function in a plain `.ts` file.
20. FOR ALL sequences of non-negative samples, THE smoothed value SHALL stay between the smallest and the largest sample seen so far (invariant property).

### Requirement 15: Pause and lifecycle

**User Story:** As a player, I want rendering behaviour to follow the same pause rules as the rest of the game, so that nothing moves while I am away.

#### Acceptance Criteria

1. WHILE the game is paused, THE PS1_Effect SHALL keep the grain pattern frozen, because its seed derives from the Game_Time.
2. WHILE the game is paused, THE Adaptive_Scaler SHALL NOT record samples, as set out in Requirement 4.
3. WHEN an act unloads, THE Renderer_Module SHALL dispose of every material the act created through the Material_Factory.
4. WHEN an act unloads, THE Renderer_Module SHALL remove the act's materials from the Snap_Patch list.
5. THE Renderer_Module SHALL register every frame callback with a priority through the engine's registration helper, and SHALL pass `dt` clamped to a maximum of 0.05 s.
6. WHEN an act is loaded, played and unloaded, THE count of registered Systems and of patched materials SHALL return to the count before the load (invariant property).
7. WHEN the WebGL context is lost, THE Renderer_Module SHALL log the event once and SHALL resume rendering when the context is restored.

### Requirement 16: End-to-end check

**User Story:** As the developer, I want one headless script that proves the look and the budgets work in a real browser.

#### Acceptance Criteria

1. THE repository SHALL contain `e2e/render.mjs`, and `npm run e2e` SHALL run it after `e2e/engine.mjs`.
2. THE Render_E2E SHALL use the same launch settings, viewport (1280x720) and error collection as the smoke test, against `process.env.GAME_URL ?? 'http://localhost:5173/?debug'`.
3. WHEN the Sandbox status is 'ready', THE Render_E2E SHALL call `render.setLevel(1)` and `render.auto(false)`.
4. THE Render_E2E SHALL check that the canvas drawing buffer is 640x360 and that the canvas CSS size is 1280x720.
5. THE Render_E2E SHALL take a screenshot and check that each colour channel of its pixels uses at most 70 distinct values.
6. THE Render_E2E SHALL call `render.setLevel(3)` and check that the drawing buffer is 320x180.
7. THE Render_E2E SHALL call `render.auto(true)` after the level 3 check.
8. THE Render_E2E SHALL check that `stats.calls` is under 150 and `stats.triangles` is under 150000.
9. THE Render_E2E SHALL set `fear` to 1 in the Store, save `e2e/shots/render-fear.png`, set `fear` back to 0, and save `e2e/shots/render.png`.
10. THE Render_E2E SHALL drive the game through `window.__los`, not through fixed waits.
11. THE Render_E2E SHALL print `errors: none` or the list of errors, and SHALL exit 1 on any error and 0 otherwise.
12. THE existing `e2e/smoke.mjs` and `e2e/engine.mjs` SHALL still pass.

### Requirement 17: Quality gates and budgets

**User Story:** As the developer, I want all repository checks to pass with the new look, so that the spec is truly done.

#### Acceptance Criteria

1. THE repository SHALL pass `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy` and `npm run e2e` when this spec is done.
2. THE Renderer_Module SHALL add no dependency over 50 kB gzipped beyond those already in `package.json`.
3. THE Renderer_Module SHALL keep the first load under 5 MB and `dist/` under 25 MB.
4. THE tests for pure logic SHALL sit next to their source file as `foo.test.ts`.
5. THE new files SHALL follow `structure.md`: render code under `src/render/`, texture code under `src/procgen/`, and the stats box under `src/ui/` or `src/render/`.
6. THE new code SHALL NOT import Three.js or React in any pure logic file listed in this spec.
7. THE new code SHALL NOT modify files in `public/audio/` or `docs/reference/`.
8. THE new code SHALL contain no `Co-Authored-By` trailer, and no AI model or vendor name in code, comments or docs.

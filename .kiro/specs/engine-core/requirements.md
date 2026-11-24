# Requirements Document

## Introduction

This spec builds the engine every act of LOSS OF SIGNAL will use: the frame loop, input, pointer lock and pause, the game store, saved settings, player movement in three modes, collision, cutscene timelines with camera shots, scripted look-at, and the act loader with checkpoints. It ends with a small dev-only sandbox scene that shows all of it working. It adds no menus, art style, audio or real acts. Those come in later specs.

The pure logic (movement, collision, timelines, settings parsing, input mapping, act order) lives in plain `.ts` files with no Three.js or React import, so it can be unit and property tested. The game loop never goes through React state.

## Glossary

- **Engine**: The set of modules under `src/engine/`, `src/interaction/` and `src/app/` that this spec adds.
- **Frame_Driver**: The single R3F component that calls the registered systems once per rendered frame.
- **System**: A named function `fn(dt, t)` registered with a priority. Lower priority runs first.
- **Game_Time**: Seconds of play time. It does not advance while paused.
- **Pausable_System**: A System that does not run while the game is paused. This is the default.
- **Input_Module**: The module that maps keyboard and mouse events to actions.
- **Action**: One of `forward`, `back`, `left`, `right`, `use`, `lookBack`, `holdBreath`, `closeEyes`, `wrist`, `pause`.
- **Pointer_Lock**: The browser pointer lock on the canvas.
- **Lock_Guard**: The 150 ms window after every pointer lock change during which mouse movement is ignored.
- **Store**: The single vanilla zustand store holding game state.
- **Settings**: The object `{ sensitivity, volume, subtitleScale, reducedMotion }`.
- **Storage_Key**: The localStorage key `loss-of-signal:v1`.
- **Player_Body**: The object holding the player's `pos`, `vel`, `yaw`, `pitch` and `mode`.
- **Capsule**: The player's collision shape, 1.8 m tall with radius 0.3 m. The eye is 1.65 m above the feet.
- **Move_Mode**: One of `walk`, `zeroG`, `seated`.
- **Box**: An axis-aligned collision box.
- **Ground_Function**: An optional act-supplied function `ground(x, z) => y`.
- **Timeline**: A cutscene description with a `duration` and optional `events`, `camera` keys, `shots`, `shake` keys and `onTick`.
- **Timeline_Player**: The runtime that advances one Timeline with the frame loop.
- **Shot**: A Timeline entry `{ from, to, cam(u, t), fov?, far? }` that overrides the camera while it runs.
- **Focus**: A scripted turn of the player's view toward a point, started with `focusOn`.
- **Act_Module**: A dynamically imported module for one act, exporting the interface defined in the design.
- **Act_Loader**: The module that loads, starts and unloads Act_Modules.
- **Load_Token**: A counter value that identifies the latest `loadAct` call.
- **Cleanup_Registry**: The helper an act uses to register cleanups that run when the act unloads.
- **Sandbox**: The dev-only Act_Module with id `sandbox`.
- **Debug_Contract**: The `window.__los` object described in `testing.md`, set only when the URL has `?debug`.
- **Engine_E2E**: The script `e2e/engine.mjs`.

## Requirements

### Requirement 1: Frame loop

**User Story:** As a gameplay developer, I want one ordered frame loop, so that every system runs in a predictable order and pausing stops game time.

#### Acceptance Criteria

1. THE Frame_Driver SHALL call each registered System once per rendered frame in ascending priority order.
2. WHEN two Systems have the same priority, THE Frame_Driver SHALL call them in registration order.
3. WHEN `registerSystem(name, priority, fn)` is called, THE Engine SHALL return an unregister function.
4. WHEN the unregister function is called, THE Frame_Driver SHALL stop calling that System from the next frame on.
5. WHEN a System unregisters itself or another System during a frame, THE Frame_Driver SHALL finish the current frame without error.
6. THE Frame_Driver SHALL pass each System a `dt` clamped to a maximum of 0.05 s and a `t` equal to the Game_Time.
7. WHILE the game is paused, THE Frame_Driver SHALL skip every Pausable_System and SHALL NOT advance Game_Time.
8. WHERE a System is registered as not pausable, THE Frame_Driver SHALL call it while the game is paused.
9. THE Frame_Driver SHALL run per-frame data through refs or the vanilla Store, and SHALL NOT trigger a React state update per frame.
10. FOR ALL sequences of raw frame deltas, THE Game_Time SHALL equal the sum of the clamped deltas of the frames that ran while not paused (metamorphic property).

### Requirement 2: Input mapping

**User Story:** As a player, I want the documented keys to work on any keyboard layout, so that the controls behave as described.

#### Acceptance Criteria

1. THE Input_Module SHALL map `KeyboardEvent.code` values to Actions: KeyW to forward, KeyS to back, KeyA to left, KeyD to right, KeyE to use, KeyQ to lookBack, Space to holdBreath, KeyC to closeEyes, KeyF to wrist, Escape to pause.
2. WHEN a mapped key goes down, THE Input_Module SHALL mark its Action as held and as pressed this frame.
3. WHEN a mapped key goes up, THE Input_Module SHALL clear the held state of its Action.
4. WHEN a key repeat event arrives for a key that is already held, THE Input_Module SHALL NOT mark the Action as pressed this frame again.
5. WHEN a frame ends, THE Input_Module SHALL clear every pressed-this-frame flag.
6. WHEN an unmapped key code arrives, THE Input_Module SHALL ignore it.
7. WHEN the window loses focus or the tab becomes hidden, THE Input_Module SHALL clear every held Action.
8. WHILE Pointer_Lock is held, WHEN the left mouse button goes down, THE Input_Module SHALL mark the `use` Action as held and as pressed this frame.
9. WHILE Pointer_Lock is not held, WHEN the left mouse button goes down, THE Input_Module SHALL NOT mark the `use` Action.
10. WHEN the left mouse button goes up, THE Input_Module SHALL clear the mouse-driven `use` hold.
11. THE Input_Module SHALL expose Space as `holdBreath` and also as the jump trigger, and the movement code SHALL use it as a jump only where the act enables jumping.

### Requirement 3: Mouse look

**User Story:** As a player, I want smooth mouse look that never flings the view, so that taking or regaining the pointer lock does not disorient me.

#### Acceptance Criteria

1. WHILE Pointer_Lock is held and no Focus is active, THE Input_Module SHALL accumulate `movementX` and `movementY` from mouse move events.
2. WHILE Pointer_Lock is not held, THE Input_Module SHALL ignore mouse movement, except in debug mode as set out in Requirement 5.
3. WHEN the accumulated movement is applied, THE Player_Body SHALL change yaw by `-movementX * 0.002 * settings.sensitivity` radians and pitch by `-movementY * 0.002 * settings.sensitivity` radians.
4. WHEN Pointer_Lock changes in either direction, THE Input_Module SHALL ignore all mouse movement for 150 ms.
5. IF a single mouse event has `|movementX|` over 400 or `|movementY|` over 400, THEN THE Input_Module SHALL discard that event.
6. WHEN an event has `|movementX|` equal to 400 and `|movementY|` equal to 400, THE Input_Module SHALL accept it.
7. THE Input_Module SHALL apply the Lock_Guard timing against a monotonic clock value passed in, so that the logic can be tested without real time.
8. WHILE a Focus is active, THE Input_Module SHALL discard mouse movement.
9. THE mouse look function SHALL be a pure function of the accumulated movement, the sensitivity, and the current yaw and pitch.
10. FOR ALL pairs of movement events A and B within one accepted window, applying A then B SHALL give the same yaw and pitch as applying A+B (confluence property).

### Requirement 4: Pointer lock and pause

**User Story:** As a player, I want the game to pause whenever I lose control of the mouse or the tab, so that no timer runs while I am away.

#### Acceptance Criteria

1. WHEN the canvas is clicked during play and Pointer_Lock is not held, THE Engine SHALL request Pointer_Lock on the canvas.
2. WHEN the tab becomes hidden, THE Engine SHALL set `paused` to true in the Store.
3. WHEN Escape is pressed during play, THE Engine SHALL set `paused` to true in the Store.
4. WHEN Pointer_Lock is lost after it was held, THE Engine SHALL set `paused` to true in the Store.
5. WHEN the player resumes, THE Engine SHALL set `paused` to false and request Pointer_Lock again.
6. WHILE the game is paused, THE Engine SHALL NOT count paused time toward any Game_Time, Timeline time, Focus time or timer registered through the Engine.
7. WHEN Pointer_Lock is lost without having been held first, THE Engine SHALL NOT change `paused`.
8. IF the browser rejects a Pointer_Lock request, THEN THE Engine SHALL stay paused and SHALL NOT throw.
9. WHEN a Pointer_Lock change happens, THE Engine SHALL start the Lock_Guard window.
10. WHEN the Escape key causes the browser to release Pointer_Lock and the game also sees the Escape key down, THE Engine SHALL end up paused once and SHALL NOT toggle `paused` twice.

### Requirement 5: Debug play without lock

**User Story:** As a test author, I want to drive the game in headless Chromium without a real pointer lock, so that end-to-end scripts can play.

#### Acceptance Criteria

1. WHERE the URL has `?debug`, THE Engine SHALL allow play without Pointer_Lock ever being taken.
2. WHERE the URL has `?debug`, WHILE Pointer_Lock was never held, THE Engine SHALL NOT pause the game because Pointer_Lock is absent.
3. WHERE the URL has `?debug`, WHEN Pointer_Lock that was held is lost, THE Engine SHALL set `paused` to true.
4. WHERE the URL has `?debug`, THE Engine SHALL treat the left mouse button as `use` only while Pointer_Lock is held.
5. WHERE the URL has no `?debug`, THE Engine SHALL treat an act as not playable until Pointer_Lock has been taken at least once.
6. WHERE the URL has `?debug`, THE Engine SHALL expose a small test helper that sets the internal "lock was held" state, so that Engine_E2E can simulate a lock loss.

### Requirement 6: Game store

**User Story:** As a gameplay developer, I want one vanilla store for game state, so that systems read it without React.

#### Acceptance Criteria

1. THE Store SHALL be a vanilla zustand store created with `createStore`, and systems SHALL read it with `getState()`.
2. THE Store SHALL hold `screen`, `act`, `checkpoint`, `paused`, `moveMode`, `objective`, `target`, `anomaliesSeen`, `settings` and `unlockedActs`.
3. THE Store SHALL start with `paused` false, `moveMode` 'walk', `anomaliesSeen` empty, `act` null, `checkpoint` null, `objective` null, `target` null, and `unlockedActs` containing only `act0-pad`.
4. THE Store SHALL type `moveMode` as `'walk' | 'zeroG' | 'seated'` and `anomaliesSeen` as `string[]`.
5. WHEN an anomaly id is added that is already in `anomaliesSeen`, THE Store SHALL leave `anomaliesSeen` unchanged.
6. WHEN an anomaly id is added that is not in `anomaliesSeen`, THE Store SHALL append it once.
7. FOR ALL sequences of anomaly additions, THE Store SHALL hold no duplicates in `anomaliesSeen` (invariant property).
8. THE Store SHALL expose setters for `screen`, `act`, `checkpoint`, `paused`, `moveMode`, `objective`, `target`, settings and unlocked acts, and later specs MAY add fields without renaming these.

### Requirement 7: Settings and persistence

**User Story:** As a player, I want my settings and unlocked chapters saved, so that they survive a reload, even if the saved data is broken or storage is blocked.

#### Acceptance Criteria

1. THE Settings SHALL have these defaults and ranges: `sensitivity` 1.0 in 0.2 to 3, `volume` 1.0 in 0 to 1, `subtitleScale` 1 in 0.8 to 1.6, `reducedMotion` false.
2. WHEN a settings setter receives a number outside the range, THE Store SHALL clamp it into the range.
3. WHEN a settings setter receives a value that is not a finite number (or not a boolean for `reducedMotion`), THE Store SHALL keep the previous value.
4. THE Engine SHALL persist Settings and `unlockedActs` as one JSON object under the Storage_Key `loss-of-signal:v1`.
5. WHEN Settings or `unlockedActs` change, THE Engine SHALL write the saved object to localStorage.
6. WHEN the app starts, THE Engine SHALL read the Storage_Key and load Settings and `unlockedActs` from it.
7. IF the stored text is not valid JSON, THEN THE parser SHALL return the defaults and SHALL NOT throw.
8. IF the stored JSON is not an object, THEN THE parser SHALL return the defaults and SHALL NOT throw.
9. IF a stored field has the wrong type, is not finite, or is out of range, THEN THE parser SHALL use the default for that field only and keep the other valid fields.
10. IF `unlockedActs` is not an array of known act ids, THEN THE parser SHALL keep only the known act ids, and SHALL always include `act0-pad`.
11. IF any localStorage read or write throws or localStorage is undefined, THEN THE Engine SHALL catch the error and continue with defaults.
12. FOR ALL valid saved objects, parsing then serializing then parsing SHALL produce an equal object (round-trip property).
13. FOR ALL arbitrary input strings, THE parser SHALL return Settings whose every field is within its range (invariant property).
14. THE serializer SHALL produce the object in the Storage_Key format, and THE parser SHALL accept what the serializer produces.

### Requirement 8: Player body and common movement rules

**User Story:** As a gameplay developer, I want pure movement functions with fixed player dimensions, so that every act moves the same way and tests need no renderer.

#### Acceptance Criteria

1. THE movement functions SHALL be plain `.ts` files that import neither Three.js nor React.
2. THE Capsule SHALL be 1.8 m tall with radius 0.3 m, and the eye SHALL be 1.65 m above the feet.
3. THE Player_Body SHALL hold `pos` (feet position), `vel`, `yaw`, `pitch` and `mode`.
4. THE Engine SHALL expose a function that returns the eye position from the Player_Body.
5. WHEN `player.set(partial)` is called with `pos`, THE Engine SHALL teleport the Player_Body to that position.
6. WHEN `player.set(partial)` is called with `yaw` or `pitch`, THE Engine SHALL set them.
7. WHEN `player.set(partial)` is called with `vel`, THE Engine SHALL set the velocity to that value, and WHEN it is called with `pos` only, THE Engine SHALL zero the velocity.
8. THE Player_Body `mode` SHALL follow the Store `moveMode`.

### Requirement 9: Walk mode

**User Story:** As a player, I want to walk on floors and slopes and jump on the Moon, so that every walking act feels right.

#### Acceptance Criteria

1. WHILE the Move_Mode is `walk`, THE movement function SHALL move the player at 1.4 m/s by default along the yaw direction using forward, back, left and right.
2. WHERE an act passes its own walk speed, THE movement function SHALL use that speed.
3. WHEN forward and left (or other diagonal) are held, THE movement function SHALL limit the horizontal speed to the walk speed.
4. THE movement function SHALL take gravity as a parameter, with 9.81 for Earth and 1.62 for the Moon.
5. THE movement function SHALL clamp pitch to the range -90° to +90°.
6. WHERE an act passes a Ground_Function, THE movement function SHALL use `ground(x, z)` as the floor height under the player.
7. WHERE no Ground_Function is passed, THE movement function SHALL use the tops of the Boxes as the floor.
8. WHILE the player is on the ground, or walking down a slope and not jumping, THE movement function SHALL keep the feet on the ground, with no bouncing.
9. WHERE an act enables jumping with a take-off speed, WHEN Space is pressed while the player is on the ground, THE movement function SHALL set the vertical velocity to that take-off speed.
10. WHEN Space is pressed while the player is not on the ground, THE movement function SHALL NOT start a jump.
11. WHERE jumping is not enabled, WHEN Space is pressed, THE movement function SHALL NOT change vertical velocity.
12. WHERE the act is the Moon (gravity 1.62, take-off speed 2.2 m/s, walk speed 2.5 m/s), THE movement function SHALL follow those values.
13. WHILE the player is in the air, THE movement function SHALL apply gravity each step until the feet reach the floor.
14. WHEN a walk step has `dt` of zero, THE movement function SHALL leave the Player_Body unchanged.

### Requirement 10: Zero-g mode

**User Story:** As a player in zero gravity, I want to drift after a push and slowly stop, so that floating through the capsule feels weighty.

#### Acceptance Criteria

1. WHILE the Move_Mode is `zeroG`, THE movement function SHALL NOT change velocity because of forward, back, left or right.
2. WHILE the Move_Mode is `zeroG`, THE movement function SHALL decay velocity each step by the factor `exp(-ln(2) / 0.5 * dt)`, so that velocity halves every 0.5 s.
3. WHILE the Move_Mode is `zeroG`, THE movement function SHALL move the position by the velocity times `dt`.
4. WHEN `launch(dir)` is called, THE Engine SHALL add to the velocity a vector along `dir` with speed `1.5 * ln(2) / 0.5` m/s.
5. WHEN a launch happens from rest in free space, THE Player_Body SHALL travel about 1.5 m before settling.
6. WHEN `launch(dir)` is called with a zero-length `dir`, THE Engine SHALL leave the velocity unchanged.
7. THE launch function SHALL normalize `dir` before using it.
8. WHEN the eye is within 2.0 m of a handrail, THE interaction code SHALL treat that handrail as usable.
9. WHEN the eye is more than 2.0 m from a handrail, THE interaction code SHALL treat that handrail as not usable.
10. FOR ALL step sizes `dt` up to 0.05 s, THE total drift distance after a launch SHALL be within 5% of 1.5 m (metamorphic property over step size).

### Requirement 11: Seated mode

**User Story:** As a player strapped into a seat, I want to look around within limits and not move, so that the cabin feels cramped.

#### Acceptance Criteria

1. WHILE the Move_Mode is `seated`, THE movement function SHALL keep the position fixed.
2. WHILE the Move_Mode is `seated`, THE movement function SHALL clamp yaw to ±100° from the seat's forward direction.
3. WHILE the Move_Mode is `seated`, THE movement function SHALL clamp pitch to ±80°.
4. WHILE the Move_Mode is `seated`, THE movement function SHALL set the velocity to zero.
5. FOR ALL yaw and pitch inputs, THE clamped seated look SHALL stay inside the limits (invariant property).
6. WHEN the seat's forward direction is not zero yaw, THE movement function SHALL measure the ±100° limit from that direction, with correct wrap-around at ±180°.

### Requirement 12: Collision

**User Story:** As a gameplay developer, I want capsule-versus-box collision that never leaves the player inside a wall, so that levels can be built from boxes.

#### Acceptance Criteria

1. THE collision function SHALL resolve the Capsule against Boxes with up to 4 push-out passes.
2. WHEN the Capsule overlaps a Box, THE collision function SHALL move the Capsule out along the axis of least penetration.
3. WHEN the Capsule overlaps no Box, THE collision function SHALL return the position unchanged.
4. WHEN the Capsule is pushed along the floor into a wall, THE collision function SHALL let it slide along the wall.
5. WHEN the Capsule lands on top of a Box, THE collision function SHALL report that the player is on the ground and zero the downward velocity.
6. WHEN the Capsule hits the underside of a Box while rising, THE collision function SHALL zero the upward velocity.
7. FOR ALL sets of random Boxes that leave room for the Capsule, after resolving, THE Capsule SHALL overlap none of the Boxes (property test).
8. FOR ALL Capsule positions that overlap no Box, THE collision function SHALL return the same position (idempotence-style property test).
9. FOR ALL positions, resolving a second time SHALL leave the result unchanged (idempotence property).
10. IF the 4 passes cannot fully separate the Capsule, THEN THE collision function SHALL return the best position found and SHALL NOT throw.

### Requirement 13: Timeline events and camera

**User Story:** As a cutscene author, I want timelines that fire events exactly once and in order, so that scripted beats never double or get lost.

#### Acceptance Criteria

1. THE Timeline SHALL have a `duration` and the optional parts `events`, `camera`, `shots`, `shake` and `onTick`.
2. THE Timeline_Player SHALL be advanced by the frame loop, so that pausing stops it.
3. WHEN Timeline time reaches or passes an event's `at`, THE Timeline_Player SHALL run that event exactly once.
4. WHEN one step of `dt` passes several events, THE Timeline_Player SHALL run them in time order, and in listed order for equal `at` values.
5. WHEN Timeline time reaches `duration`, THE Timeline_Player SHALL mark the Timeline as finished and run any event with `at` up to `duration`.
6. WHILE the Timeline is running, THE Timeline_Player SHALL call `onTick(t)` once per step with the Timeline time.
7. WHEN `camera` keys exist, THE Timeline_Player SHALL interpolate `position` and `lookAt` between neighbouring keys.
8. WHEN Timeline time is before the first camera key or after the last, THE Timeline_Player SHALL hold the nearest key.
9. WHEN `skip()` is called, THE Timeline_Player SHALL run every remaining event once, in order, and end the Timeline.
10. WHEN `skip()` is called a second time, THE Timeline_Player SHALL run no more events.
11. WHEN `skip()` is called after the Timeline has finished, THE Timeline_Player SHALL run no events.
12. FOR ALL sequences of `dt` steps that sum to the same total time, THE Timeline_Player SHALL run the same events in the same order (confluence property).
13. FOR ALL event lists, THE count of events run SHALL never exceed the event count, and each event SHALL run at most once (invariant property).
14. WHILE the game is paused, THE Timeline time SHALL NOT advance.

### Requirement 14: Timeline shots and shake

**User Story:** As a cutscene author, I want shots that override the camera only while they run, and shake that respects reduced motion.

#### Acceptance Criteria

1. WHILE Timeline time is inside a Shot's range, THE Timeline_Player SHALL use that Shot's `cam(u, t)` result as the camera position and look-at target, where `u` runs from 0 to 1 over the Shot.
2. WHEN a Shot has `fov` or `far`, THE Timeline_Player SHALL apply them while that Shot runs.
3. WHEN Timeline time is outside every Shot, THE Timeline_Player SHALL report the player's own camera.
4. WHEN Timeline time equals a Shot's `from`, THE Timeline_Player SHALL select that Shot with `u` equal to 0.
5. WHEN Timeline time equals a Shot's `to` and the next Shot's `from` is the same value, THE Timeline_Player SHALL select the next Shot.
6. WHEN Timeline time equals the `to` of the last Shot touching that time, THE Timeline_Player SHALL report the player's own camera.
7. WHEN Shots overlap, THE Timeline_Player SHALL select the one listed last.
8. WHEN `shake` keys exist, THE Timeline_Player SHALL interpolate `amp` in metres linearly between keys, and hold the first and last values outside the keyed range.
9. WHERE `settings.reducedMotion` is true, THE Timeline_Player SHALL scale the shake amplitude to 25% of its value.
10. WHEN the Timeline has finished, THE Timeline_Player SHALL report zero shake and the player's own camera.
11. IF a Shot has `to` less than or equal to `from`, THEN THE Timeline_Player SHALL ignore that Shot.
12. THE shot selection code SHALL be a pure function of the Timeline and the time, with no Three.js import.

### Requirement 15: Scripted look-at

**User Story:** As a cutscene author, I want to turn the player's view toward a point, so that I can direct attention.

#### Acceptance Criteria

1. WHEN `focusOn(target, seconds, hold)` is called, THE Engine SHALL turn the player's yaw and pitch smoothly toward the target over `seconds`, with `seconds` defaulting to 2 and `hold` defaulting to false.
2. WHERE `target` is a function, THE Engine SHALL read the target point from it every step.
3. WHILE a Focus is active, THE Engine SHALL discard mouse look.
4. WHEN `hold` is false and the turn time has passed, THE Engine SHALL end the Focus.
5. WHERE `hold` is true, WHEN the turn time has passed, THE Engine SHALL keep facing the target until `clearFocus()` is called.
6. WHEN `clearFocus()` is called, THE Engine SHALL end the Focus and let mouse look work again.
7. WHEN a second `focusOn` is called during a Focus, THE Engine SHALL replace the earlier Focus from the current view direction.
8. WHILE a Focus is active, `focus()` in the Debug_Contract SHALL return true, and otherwise it SHALL return false.
9. WHEN the turn takes the short way around the yaw circle, THE Engine SHALL turn by the shorter angle.
10. WHILE the game is paused, THE Focus time SHALL NOT advance.
11. WHEN the Focus has finished its turn time, THE view direction SHALL equal the direction to the target within 0.001 rad.

### Requirement 16: Act order

**User Story:** As a gameplay developer, I want one definition of act ids and their order, so that the loader and menus agree.

#### Acceptance Criteria

1. THE Engine SHALL define the act order as `act0-pad`, `act1-launch`, `act2-coast`, `act3-farside`, `act4-moon`, `act5-home`, matching the `ActId` type in `src/types.ts`.
2. WHEN `nextAct(id)` is called with an act id other than `act5-home`, THE Engine SHALL return the next id in that order.
3. WHEN `nextAct('act5-home')` is called, THE Engine SHALL return null.
4. THE Act_Loader SHALL register a placeholder Act_Module for each act id until a later spec replaces it.
5. EACH placeholder Act_Module SHALL list at least a `start` checkpoint, and `act3-farside` SHALL list `start`, `wp0`, `wp1`, `wp2`, `wp3`, and `act4-moon` SHALL list `start`, `tasks`, `run`.
6. FOR ALL act ids except the last, following `nextAct` from `act0-pad` SHALL reach `act5-home` in exactly 5 steps (invariant property).

### Requirement 17: Act loading

**User Story:** As a gameplay developer, I want a loader that swaps acts safely, so that only one act is ever active.

#### Acceptance Criteria

1. THE Act_Module SHALL export an `id`, a `checkpoints` list whose first entry is the act start, a `Scene` component and a `start(checkpoint)` function, as set out in the design.
2. WHEN `loadAct(id, checkpoint?)` is called, THE Act_Loader SHALL set the loader status to 'loading'.
3. WHEN `loadAct` runs, THE Act_Loader SHALL unload the current act, import the new Act_Module, call its `start` with the checkpoint, and then set the status to 'ready'.
4. WHEN no checkpoint is passed, THE Act_Loader SHALL start the act at its first checkpoint.
5. IF the checkpoint passed is not in the act's list, THEN THE Act_Loader SHALL start at the first checkpoint.
6. WHEN an import fails, THE Act_Loader SHALL set the status to 'error' and SHALL NOT leave a half-started act active.
7. THE Act_Loader SHALL give each `loadAct` call a Load_Token.
8. IF `loadAct` is called again before an earlier call finishes, THEN THE earlier call SHALL NOT start its act or set the status to 'ready'.
9. WHEN `loadAct` has finished, THE loader state SHALL report the `status`, `act` and `checkpoint` of the latest call.
10. THE Act_Loader SHALL keep at most one Act_Module loaded at a time.
11. WHEN an act starts, THE Act_Loader SHALL write `act` and `checkpoint` to the Store.
12. FOR ALL sequences of overlapping `loadAct` calls, THE final active act SHALL be the one from the last call (property test with controllable import timing).
13. THE Act_Loader SHALL load each act with a dynamic `import()` so that each act becomes its own build chunk.

### Requirement 18: Act cleanup

**User Story:** As a gameplay developer, I want every system, timer and listener an act adds to be removed on unload, so that nothing leaks between acts.

#### Acceptance Criteria

1. THE Cleanup_Registry SHALL offer one function that an act calls to register a cleanup function.
2. WHEN an act unloads, THE Act_Loader SHALL run every registered cleanup exactly once.
3. WHEN an act unloads, THE Act_Loader SHALL run the cleanups in reverse registration order.
4. IF a cleanup throws, THEN THE Act_Loader SHALL log the error and still run the remaining cleanups.
5. THE Engine SHALL provide registration helpers for systems, timers and event listeners that add their cleanup to the Cleanup_Registry automatically.
6. WHEN an act unloads, THE Engine SHALL end any active Timeline and any Focus.
7. WHEN an act unloads, THE Engine SHALL set `moveMode` back to 'walk' and clear `objective` and `target`.
8. WHEN an act is loaded, played and unloaded, THE count of registered Systems SHALL return to the count before the load (invariant property).
9. WHEN `loadAct` is called while another act is loaded, THE unload of the earlier act SHALL finish before the new act starts.

### Requirement 19: Sandbox act

**User Story:** As a developer, I want a small scene that shows the engine working, so that I can walk around and check every feature by hand and in tests.

#### Acceptance Criteria

1. THE Sandbox SHALL be an Act_Module with id `sandbox`.
2. WHERE the URL has `?debug`, THE Act_Loader SHALL allow `loadAct('sandbox')`.
3. WHERE the URL has no `?debug`, THE Act_Loader SHALL refuse `loadAct('sandbox')`, set the status to 'error' and SHALL NOT import the Sandbox module.
4. THE production build SHALL put the Sandbox in its own dynamically imported chunk.
5. THE Sandbox SHALL contain a small grey room with a few Boxes to walk around and against.
6. THE Sandbox SHALL contain a ramp or bumpy ground built with the Ground_Function.
7. THE Sandbox SHALL contain a zero-g zone that sets `moveMode` to 'zeroG' while the eye is inside it, and sets it back to 'walk' when the eye leaves.
8. THE Sandbox SHALL contain a seat that sets `moveMode` to 'seated' while the player is seated in it.
9. WHEN T is pressed, THE Sandbox SHALL play a 6-second test Timeline with two Shots, a shake and an event.
10. WHEN the test Timeline is already running and T is pressed, THE Sandbox SHALL NOT start a second copy.
11. THE Sandbox SHALL use plain colours, and SHALL NOT apply the PS1 look.
12. THE Sandbox SHALL expose through the Debug_Contract the room's wall position, the zero-g zone and the test Timeline time, so that Engine_E2E can check them.
13. THE Sandbox SHALL NOT contain player-facing text.

### Requirement 20: App entry behaviour

**User Story:** As a developer, I want the app to open in the sandbox when debugging, and otherwise stay on the title text, until menus exist.

#### Acceptance Criteria

1. WHERE the URL has `?debug`, WHEN the app starts, THE app SHALL load the Sandbox through the Act_Loader.
2. WHERE the URL has no `?debug`, WHEN the app starts, THE app SHALL show the title text from the environment spec and SHALL NOT load any act.
3. WHERE the URL has no `?debug`, THE app SHALL NOT define `window.__los`.
4. THE app SHALL render the loaded act's Scene inside the R3F Canvas, with the Frame_Driver mounted once.
5. WHEN no act is loaded, THE app SHALL render the Canvas with a black clear colour.

### Requirement 21: Debug contract additions

**User Story:** As a test author, I want the engine reachable through `window.__los`, so that scripts can drive the game without timing guesses.

#### Acceptance Criteria

1. WHERE the URL has `?debug`, THE app SHALL set `window.__los.store` to the vanilla Store.
2. WHERE the URL has `?debug`, THE app SHALL set `window.__los.loader` with `state.getState()` returning `{ status, act, checkpoint }` and `loadAct(id, checkpoint?)` returning a Promise.
3. WHERE the URL has `?debug`, THE app SHALL set `window.__los.player` with `body`, `set(partial)` and `launch(dir)`.
4. WHEN no act is loaded, `window.__los.player.body` SHALL be null.
5. WHEN an act is loaded, `window.__los.player.body` SHALL hold `pos`, `vel`, `yaw`, `pitch` and `mode`.
6. WHERE the URL has `?debug`, THE app SHALL set `window.__los.focus` as a function that returns true while a Focus is active.
7. THE app SHALL keep the existing `version` field and SHALL NOT rename any Debug_Contract field.
8. WHERE the URL has `?debug`, THE app SHALL expose the lock test helper from Requirement 5 under `window.__los`.

### Requirement 22: End-to-end check

**User Story:** As the developer, I want one headless script that proves the engine works in a real browser.

#### Acceptance Criteria

1. THE repository SHALL contain `e2e/engine.mjs`, and `npm run e2e` SHALL run it after `e2e/smoke.mjs`.
2. THE Engine_E2E SHALL use the same launch settings, viewport and error collection as the smoke test, against `process.env.GAME_URL ?? 'http://localhost:5173/?debug'`.
3. WHEN the Sandbox status is 'ready', THE Engine_E2E SHALL hold KeyW for 2 s with real key presses and check that the player moved forward at least 2 m and at most 3.5 m, with no wall crossed.
4. THE Engine_E2E SHALL walk into a wall and check that the player stops at the wall.
5. THE Engine_E2E SHALL teleport the player into the zero-g zone, call `player.launch(dir)`, and check that the player drifts between 1.2 m and 1.8 m and then stops.
6. THE Engine_E2E SHALL start the test Timeline, simulate a lock loss through the test helper and a `pointerlockchange` event with no locked element, and check that `store.paused` is true and that the Timeline time does not advance over 1 s.
7. WHEN the Engine_E2E resumes, THE Engine_E2E SHALL check that the Timeline time advances again.
8. THE Engine_E2E SHALL call `loadAct('sandbox')` twice quickly, then check that only one Sandbox is active and the status is 'ready'.
9. THE Engine_E2E SHALL save `e2e/shots/engine.png`.
10. THE Engine_E2E SHALL print `errors: none` or the list of errors, and SHALL exit 1 on any error and 0 otherwise.
11. THE `e2e/README.md` SHALL mention the new script.

### Requirement 23: Done criteria

**User Story:** As the developer, I want a clear finish line.

#### Acceptance Criteria

1. WHEN this spec is done, `npm run test`, `npm run lint`, `npm run build`, `npm run check-budget`, `npm run check-copy` and `npm run e2e` SHALL all exit 0, and their summary lines SHALL be pasted in the report.
2. THE `git log` SHALL show one commit per task, each with a short conventional message and no trailers.
3. THE Engine SHALL add no dependency over 50 kB gzipped and SHALL NOT add a physics engine.
4. THE Engine SHALL NOT modify files in `public/audio/` or `docs/reference/`.
5. THE Engine SHALL keep all player-facing text in `src/content/`, and the Sandbox SHALL add none.

# Design: act3-nightmare

## Decisions
- **Cabin copy.** Acts cannot import each other, so act 3 gets its own `cabin.tsx` (command module room, three bags). One component, `real` flag: dream = empty unzipped bags, real = sleepers turned toward Buzz.
- **Layout.** The cabin sits at z 4 to 7.5, behind the old hatch end. The hatch end wall becomes a doorway (x +-0.5, 1.9 m high). The cage fills the far end (z -44 to -41.2). Patrol loop and side room stay.
- **Checkpoints.** `start` cabin. `wp0` z < -5. `wp1` z < -37 (cage closed, nothing carried). `wp2` crewman laid down (player at the bags, silent phase). `wp3` back at the cage, z < -37 in the silent phase. Restart positions are in `layout.ts`.
- **Gravity.** `walk` mode, Earth gravity, no hint about it. Speed 1.4 m/s, 0.95 m/s carrying (`step.speed` is changed in place).
- **Noise.** `stepNoise` gets `gait?: 'walk' | 'carry'`. Moving on foot sets a floor of 0.3 (0.45 carrying). Other acts pass nothing and are unchanged.
- **Rim light.** The scene allows one dynamic light (the flashlight). The dim red rim is an inverted hull in unlit dark red. The creature stays under 3,000 triangles with the hull.
- **Creature model.** New `procgen/astronaut.ts`. Act 4 keeps the old model. Pose logic is pure (`astronautPose.ts`): time snapped to 8 steps per second, head tilt toward the sound. Lunge timeline is pure (`lunge.ts`): rise 0 to 0.6 s, lunge and jaw open 0.6 to 1.1 s, closed over the view 1.1 to 1.2 s.
- **Locker.** Eye x = door face - 0.25 m. Slats are real boxes (4.5 cm, pitch 14 cm). `LockerSlats` overlay and its CSS are deleted. `stepSeated` takes optional `yawLimit` and `pitchLimit`; the locker uses 30 degrees.
- **Carried view model.** A group placed each frame at the eye with the camera rotation. Parts in camera space: helmet low left, arm at right edge, boot low left. All below y -0.22 so at most the bottom quarter is covered.
- **Real wake.** World flag `act3State.world` switches the scene between `dream` (corridor, creature, red ambient, flashlight) and `real` (cabin only, dim warm hemisphere light).
- **Choice.** `gameStore.dreamChoice` (`'dream' | 'fine' | null`) and `gameStore.choice` (open prompt). `startRun` clears the first. `ChoicePrompt` overlay handles mouse and `Digit1/Digit2`. Beats call `deps.openChoice()`.
- **Debug.** `getAct3Info()` in `engine/debugInfo.ts` feeds `__los.act3`. `director` keeps its fields.
- **Archive.** The `impostor-capcom` text is rewritten. The Archive adds the "You told them" line from the store (menus content).
- **Phases.** `wake`, `explore`, `cage`, `carryBack`, `laid`, `silent`, `final`, `lunge`, `black`, `wakeUp`, `choice`, `reply`, `out`, `done`, `caught`. Pure beats on a fake clock.
- **Audio.** Silent phase: `bed 'none'`, tension forced to CALM, creature sounds off. Lunge: `sting` plus a second `groan`.
- **Out of scope.** Act 4 chapter card text and the act 4 creature are left as they are.

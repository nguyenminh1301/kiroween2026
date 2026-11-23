---
inclusion: always
---

# Structure

```
src/
  app/          entry, screens, act loader, pause, settings
  engine/       loop, frame priorities, store, input, player body, collision
  render/       low-res pipeline, PS1 shaders, dither, fog, adaptive resolution
  audio/        mixer, radio queue, synth fallbacks, tone generators
  interaction/  interactables, verbs, focus, scripted camera moves
  ui/           React overlays: objective, dialogue, captions, menus, archive
  director/     act 3 noise and monster logic
  timeline/     timelines and cue runners
  procgen/      canvas textures and code-built geometry
  acts/<act-id>/ one folder per act: scene, logic, checkpoints, index.ts
  content/      all player-facing text
  types.ts      shared types, including ActId
e2e/            Node .mjs scripts, shots go to e2e/shots/
scripts/        check-budget, check-copy
```

## Rules
- All player-facing text lives in `src/content/`, nowhere else.
- Tests sit next to the file they test: `foo.ts`, `foo.test.ts`.
- Shared types live in `src/types.ts`, including:
  `ActId = 'act0-pad' | 'act1-launch' | 'act2-coast' | 'act3-farside' | 'act4-moon' | 'act5-home'`.
- Acts import from engine, render, audio, interaction and procgen. They never import from another act.
- Pure logic files import no Three.js and no React.

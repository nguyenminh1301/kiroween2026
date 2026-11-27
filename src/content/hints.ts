export interface HintDef {
  key: string
  text: string
  /** Show even when the objective strip names the same key. */
  always?: boolean
}

export const HINTS: Record<string, HintDef> = {
  push: { key: 'E', text: 'Look where you want to go and press E near a rail to push off.' },
  breath: { key: 'SPACE', text: 'Hold SPACE to hold your breath. Hidden, it can not hear you then.' },
  hide: { key: 'E', text: 'Get into a locker or into an empty bag. Stay still until it passes.' },
  locker: { key: 'SPACE', text: 'Stay still. Hold SPACE to hold your breath. Press E to come out.' },
  chase: { key: 'E', text: 'Keep pressing E on the rails. When you stop, it catches up.' },
  lookBack: { key: 'Q', text: 'Looking back slows you down.' },
  hatch: { key: 'E', text: 'Open the hatch.' },
  cage: { key: 'E', text: 'The cage door is ahead. Go up to its handle and press E to open it.', always: true },
  walk: { key: 'W A S D', text: 'Walk. Move the mouse to look around.' },
  use: { key: 'E', text: 'Press E to use what the dot is on.' },
  sleep: { key: 'C', text: 'Hold to close your eyes and sleep.' },
  gauge: { key: 'A D', text: 'Turn the knob with A and D or the mouse wheel. Hold the needle in the green band.' },
  idle: { key: 'E', text: 'Still there? The paper at the top right says what to do next.' },
  jump: { key: 'SPACE', text: "Jump. Gravity here is a sixth of Earth's." },
}

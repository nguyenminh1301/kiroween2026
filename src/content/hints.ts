export interface HintDef {
  key: string
  text: string
}

export const HINTS: Record<string, HintDef> = {
  push: { key: 'E', text: 'Look where you want to go and press E near a rail to push off.' },
  breath: { key: 'SPACE', text: 'Hold SPACE to hold your breath. In a locker, it can not hear you then.' },
  hide: { key: 'E', text: 'Get into a locker and hold your breath until it passes.' },
  locker: { key: 'SPACE', text: 'Hold your breath until it goes. Press E to climb out.' },
  chase: { key: 'E', text: 'Keep pressing E on the rails. When you stop, it catches up.' },
  lookBack: { key: 'Q', text: 'Looking back slows you down.' },
  hatch: { key: 'E', text: 'Open the hatch.' },
  walk: { key: 'W A S D', text: 'Walk. Move the mouse to look around.' },
  use: { key: 'E', text: 'Press E to use what the dot is on.' },
  sleep: { key: 'C', text: 'Hold to close your eyes and sleep.' },
  idle: { key: 'E', text: 'Still there? The paper at the top right says what to do next.' },
  jump: { key: 'SPACE', text: "Jump. Gravity here is a sixth of Earth's." },
}

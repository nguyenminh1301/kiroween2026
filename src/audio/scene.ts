export type Bed = 'ship' | 'engine' | 'none'

export interface AmbienceScene {
  hum: number
  bed: Bed
  vent: number
  wind: number
  birds: boolean
  ocean: number
  heli: number
  steps: number
  breath: boolean
}

export const DEFAULT_SCENE: AmbienceScene = {
  hum: 1,
  bed: 'ship',
  vent: 0,
  wind: 0,
  birds: false,
  ocean: 0,
  heli: 0,
  steps: 0,
  breath: true,
}

const level = (v: unknown, def: number): number =>
  v === undefined ? def : typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0

/** Fill the fields an act left out with defaults and clamp the rest. */
export function resolveScene(partial: Partial<AmbienceScene> = {}): AmbienceScene {
  const d = DEFAULT_SCENE
  const bed = partial.bed === 'ship' || partial.bed === 'engine' || partial.bed === 'none' ? partial.bed : d.bed
  return {
    hum: level(partial.hum, d.hum),
    bed,
    vent: level(partial.vent, d.vent),
    wind: level(partial.wind, d.wind),
    birds: partial.birds === undefined ? d.birds : partial.birds === true,
    ocean: level(partial.ocean, d.ocean),
    heli: level(partial.heli, d.heli),
    steps: level(partial.steps, d.steps),
    breath: partial.breath === undefined ? d.breath : partial.breath === true,
  }
}

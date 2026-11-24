// DSKY state and the three scripted key presses. Pure: no Three.js or React imports.
export interface DskyLamps {
  compActy: boolean
  keyRel: boolean
  progAlarm: boolean
}

export interface DskyState {
  prog: string
  verb: string
  noun: string
  r1: string
  r2: string
  r3: string
  lamps: DskyLamps
}

export function initialDsky(): DskyState {
  return {
    prog: '01',
    verb: '',
    noun: '',
    r1: '',
    r2: '',
    r3: '',
    lamps: { compActy: true, keyRel: false, progAlarm: false },
  }
}

/** The display after press `n` (1 to 3). Anything else leaves the state as it is. */
export function dskyAfterPress(state: DskyState, n: number): DskyState {
  switch (n) {
    case 1:
      return { ...state, verb: '37' }
    case 2:
      return { ...state, prog: '15', verb: '06', noun: '33', r1: '+00002', r2: '+00044', r3: '+01600' }
    case 3:
      return { ...state, prog: '15', verb: '16', noun: '95', r1: '+10421', r2: '+00003', r3: '+00000' }
    default:
      return state
  }
}

export function withKeyRel(state: DskyState, on: boolean): DskyState {
  return { ...state, lamps: { ...state.lamps, keyRel: on } }
}

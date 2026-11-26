// The act 1 stage machine: launch, keyin, tli, done. Pure: no Three.js or React imports.
import { dskyAfterPress, initialDsky, type DskyState } from '../../procgen/cabin/dsky'

export type Stage = 'launch' | 'keyin' | 'tli' | 'done'

export const KEY_PRESSES = 3

export interface Stages {
  stage(): Stage
  presses(): number
  dsky(): DskyState
  /** The launch timeline ended. Only works in `launch`. */
  launchDone(): boolean
  /** A DSKY press. Works only in `keyin`. Returns the press number (1 to 3) or 0 when ignored. */
  press(): number
  /** The TLI timeline ended. Only works in `tli`. */
  tliDone(): boolean
}

export function createStages(): Stages {
  let stage: Stage = 'launch'
  let presses = 0
  let dsky = initialDsky()
  return {
    stage: () => stage,
    presses: () => presses,
    dsky: () => dsky,
    launchDone() {
      if (stage !== 'launch') return false
      stage = 'keyin'
      return true
    },
    press() {
      if (stage !== 'keyin') return 0
      presses++
      dsky = dskyAfterPress(dsky, presses)
      if (presses >= KEY_PRESSES) stage = 'tli'
      return presses
    },
    tliDone() {
      if (stage !== 'tli') return false
      stage = 'done'
      return true
    },
  }
}

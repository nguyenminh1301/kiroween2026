// The act 0 beat machine. Pure: lines, objectives, camera turns and sounds are injected,
// so a test can drive it on a fake clock. No Three.js or React imports.
import type { Vec3 } from '../../types'
import { cheerPeriod } from './crowdLogic'

export type ObjectiveKey = 'act0Wave' | 'act0Board'

export interface SayOptions {
  /** Clear the queue and say this line now. */
  urgent?: boolean
  onStart?: () => void
  /** The beat that said the line. */
  beat?: number
}

export interface BeatDeps {
  /** Say a line. `done` runs when it ends (or is dropped). */
  say(id: string, opts: SayOptions, done: () => void): void
  /** A new beat started: queued lines of earlier beats are dropped. */
  setBeat?(beat: number): void
  focusOn(target: Vec3 | (() => Vec3), seconds?: number): void
  headOf(name: string): () => Vec3
  setObjective(key: ObjectiveKey | null): void
  showHint(id: string): void
  /** Play the cheer and raise the crowd excitement to at least `level`. */
  cheer(level: number): void
  playSwitch(): void
  complete(): void
}

export const START_DELAY = 0.8
export const CROWD_FOCUS: Vec3 = { x: 110, y: -75, z: -10 }
export const ROOM_FOCUS: Vec3 = { x: 0, y: 1.3, z: -7 }
export const PERIODIC_CHEER = 0.7

export interface Beats {
  tick(dt: number): void
  /** The player used WAVE. */
  wave(): void
  /** The player is inside the White Room. Call every frame or on change. */
  enterRoom(): void
  /** The player used the hatch. */
  board(): void
  state(): { waved: boolean; inRoom: boolean; boarded: boolean; started: boolean }
}

export function createBeats(deps: BeatDeps): Beats {
  let clock = 0
  let started = false
  let waved = false
  let inRoom = false
  let boarded = false
  let cheerLeft = cheerPeriod(false)
  let beat = 0
  const go = (n: number): void => {
    beat = n
    deps.setBeat?.(n)
  }

  const say = (id: string, opts: SayOptions, done: () => void = () => {}): void => {
    const b = beat
    deps.say(id, { ...opts, beat: b }, () => {
      if (b === beat && (!boarded || id === 'act0.board')) done()
    })
  }

  function begin(): void {
    started = true
    deps.showHint('walk')
    say('act0.intro1', {}, () =>
      say('act0.intro2', { onStart: () => deps.focusOn(CROWD_FOCUS) }, () =>
        say('act0.pad1', {
          onStart: () => {
            deps.focusOn(deps.headOf('pad0'))
            if (!waved) deps.setObjective('act0Wave')
          },
        }),
      ),
    )
  }

  return {
    tick(dt) {
      if (boarded) return
      clock += dt
      if (!started && clock >= START_DELAY) begin()
      if (inRoom) return
      cheerLeft -= dt
      if (cheerLeft <= 0) {
        deps.cheer(PERIODIC_CHEER)
        cheerLeft = cheerPeriod(waved)
      }
    },
    wave() {
      if (boarded) return
      deps.cheer(1)
      if (waved) return
      waved = true
      go(1)
      cheerLeft = cheerPeriod(true)
      deps.setObjective('act0Board')
      say('act0.pad2', { onStart: () => deps.focusOn(ROOM_FOCUS) })
    },
    enterRoom() {
      if (inRoom || boarded) return
      inRoom = true
      go(2)
      say('act0.pad3', { onStart: () => deps.focusOn(deps.headOf('pad1')) })
    },
    board() {
      if (boarded) return
      boarded = true
      deps.playSwitch()
      deps.setObjective(null)
      say('act0.board', { urgent: true }, () => deps.complete())
    },
    state: () => ({ waved, inRoom, boarded, started }),
  }
}

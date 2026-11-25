// The act 2 dialogue beats. Each step the player takes starts a new beat: lines still queued
// from earlier beats are dropped, a playing one fades out, and the new objective shows at once.
// Pure: radio, camera turns and the checklist are injected, so a test can run it on a fake
// clock. No Three.js or React imports.
import type { Vec3 } from '../../types'

export type ObjectiveKey = 'act2Out' | 'act2Fix' | 'act2Push' | 'act2Back' | 'act2Sleep' | 'act2Eyes'

export interface Act2Radio {
  say(id: string, opts: { onStart?: () => void; beat: number }): Promise<void>
  setBeat(beat: number): void
}

export interface Act2BeatDeps {
  radio: Act2Radio
  alive(): boolean
  focusOn(target: Vec3 | (() => Vec3), seconds: number): void
  headOf(name: string): () => Vec3
  setObjective(key: ObjectiveKey | null): void
  outView: Vec3
  breakerPos: Vec3
  tunnelView: Vec3
}

export interface Act2Beats {
  /** Beat 0: the objective and the two opening lines. */
  begin(): void
  /** Beat 1: the player floated into the lander. */
  crossLander(): void
  /** Beat 2: the player took the pen. */
  takePen(): void
  /** Beat 3: the breaker is in. */
  fixBreaker(): void
  /** Beat 4: the player is back in the command module. */
  crossCm(): void
  /** Beat 5: the player is in the bag. */
  enterBag(): void
  /** A sleep whisper, in the current beat. */
  say(id: string): void
  beat(): number
}

export function createAct2Beats(d: Act2BeatDeps): Act2Beats {
  let beat = 0
  const go = (n: number): void => {
    beat = n
    d.radio.setBeat(n)
  }
  // `done` only runs while the beat that said the line is still the current one.
  const say = (id: string, onStart?: () => void, done?: () => void): void => {
    const b = beat
    void d.radio.say(id, { onStart, beat: b }).then(() => {
      if (d.alive() && b === beat) done?.()
    })
  }
  return {
    begin() {
      d.setObjective('act2Out')
      say('act2.night', () => d.focusOn(d.headOf('cmp'), 1.2), () =>
        say('act2.out', () => d.focusOn(d.outView, 1.5)),
      )
    },
    crossLander() {
      go(1)
      d.setObjective('act2Fix')
      say('act2.breaker', () => d.focusOn(d.breakerPos, 1.5))
    },
    takePen() {
      go(2)
      d.setObjective('act2Push')
      say('act2.pen')
    },
    fixBreaker() {
      go(3)
      d.setObjective('act2Back')
      say('act2.fixed', () => d.focusOn(d.tunnelView, 1.5))
    },
    crossCm() {
      go(4)
      d.setObjective('act2Sleep')
      say('act2.longer', () => d.focusOn(d.headOf('cmp'), 1.2), () =>
        say('act2.sleep', () => d.focusOn(d.headOf('cdr'), 1.2)),
      )
    },
    enterBag() {
      go(5)
      d.setObjective('act2Eyes')
    },
    say: (id) => say(id),
    beat: () => beat,
  }
}

// The act 2 dialogue beats. Each step the player takes starts a new beat: lines still queued
// from earlier beats are dropped, a playing one fades out, and the new objective shows at once.
// Pure: radio and the checklist are injected, so a test can run it on a fake clock. Nothing here turns the
// player's view. No Three.js or React imports.

export type ObjectiveKey = 'repairs' | 'act2Back' | 'act2Sleep' | 'act2Eyes'
export type RepairName = 'o2' | 'press' | 'panel' | 'site'
/** What the player does next after a step: more repairs, the trip back, or bed. */
export type Next = 'repairs' | 'back' | 'sleep'

export interface Act2Radio {
  say(id: string, opts: { onStart?: () => void; beat: number }): Promise<void>
  setBeat(beat: number): void
}

export interface Act2BeatDeps {
  radio: Act2Radio
  alive(): boolean
  setObjective(key: ObjectiveKey | null): void
}

export interface Act2Beats {
  /** Beat 0: the objective and the opening lines. */
  begin(): void
  /** The player came near the oxygen line joint. */
  nearJoint(): void
  /** The player floated into the lander. */
  enterLander(): void
  /** A repair is done. */
  repairDone(which: RepairName, next: Next): void
  /** The player is back in the command module after the lander. */
  crossBack(next: Next): void
  /** The player is in the bag. */
  enterBag(): void
  /** A line in the current beat. */
  say(id: string): void
  beat(): number
}

const DONE_LINE: Record<RepairName, string> = {
  o2: 'act2.o2done',
  press: 'act2.pressdone',
  panel: 'act2.paneldone',
  site: 'act2.sitedone',
}

export function createAct2Beats(d: Act2BeatDeps): Act2Beats {
  let beat = 0
  const go = (): void => {
    beat++
    d.radio.setBeat(beat)
  }
  // `done` only runs while the beat that said the line is still the current one.
  const say = (id: string, done?: () => void): void => {
    const b = beat
    void d.radio.say(id, { beat: b }).then(() => {
      if (d.alive() && b === beat) done?.()
    })
  }
  const after = (next: Next): void => {
    if (next === 'sleep') d.setObjective('act2Sleep')
    else if (next === 'back') d.setObjective('act2Back')
    else d.setObjective('repairs')
  }
  return {
    begin() {
      d.setObjective('repairs')
      say('act2.jobs', () => say('act2.press', () => say('act2.out')))
    },
    nearJoint() {
      go()
      say('act2.o2')
    },
    enterLander() {
      go()
      say('act2.site', () => say('act2.panel'))
    },
    repairDone(which, next) {
      go()
      after(next)
      say(DONE_LINE[which], next === 'sleep' ? () => say('act2.sleep') : undefined)
    },
    crossBack(next) {
      go()
      after(next)
      say('act2.longer', next === 'sleep' ? () => say('act2.sleep') : undefined)
    },
    enterBag() {
      go()
      d.setObjective('act2Eyes')
    },
    say: (id) => say(id),
    beat: () => beat,
  }
}

// The act 3 beat flow, the dream: wake in the bag, walk the corridor, open the cage, carry one crewman
// back, go back for the other, the lunge, wake up in the real cabin, the choice.
// Pure: no Three.js or React imports. Every effect goes through `BeatDeps`, time through `tick(dt)`,
// so a test can run the whole act on a fake clock and paused time never counts.
import type { TensionEvent } from '../../director/tension'
import { JOLT_AT, LUNGE_TOTAL } from '../../procgen/lunge'
import { CAGE_ARRIVE_Z, checkpointAt, checkpointIndex, IMPOSTOR_Z, type Checkpoint } from './layout'

export type Crew = 'cdr' | 'cmp'
export type Choice = 'dream' | 'fine'
export type ObjectiveKey = 'act3Find' | 'act3Hide' | 'act3Hunted' | 'act3Carry' | 'act3Back'
export type Sfx = 'sting' | 'scrape' | 'groan' | 'gasp' | 'cage'

export interface SayOpts {
  urgent?: boolean
  speaker?: 'UNKNOWN'
  detuneHz?: number
  /** Where the voice comes from. Default: the player's shoulder. */
  from?: Crew | 'player'
  /** Called when the line ends. */
  then?: () => void
}

export interface BeatDeps {
  say(id: string, opts?: SayOpts): void
  setObjective(key: ObjectiveKey | null): void
  hint(id: string): void
  tension(event: TensionEvent): void
  checkpoint(name: Checkpoint): void
  anomaly(id: string): void
  sfx(name: Sfx): void
  blackout(v: number): void
  /** Stand up out of the bag. */
  getUp(): void
  openCage(): void
  /** The crewman goes over Buzz's shoulders. */
  carry(who: Crew): void
  /** The carried crewman goes into his bag. */
  layDown(who: Crew): void
  /** The corridor goes quiet and the creature leaves it. */
  setSilent(on: boolean): void
  /** The creature rises behind the second crewman. */
  startLunge(): void
  /** Swap to the real cabin and put Buzz in his bag. */
  wakeUp(): void
  openChoice(open: boolean): void
  storeChoice(c: Choice): void
  restart(): void
  complete(): void
  /** Who was carried first in an earlier try, for restarts at wp2 and wp3. */
  firstCarried(): Crew | null
}

export type Phase =
  | 'wake'
  | 'explore'
  | 'cage'
  | 'cageOpen'
  | 'carry'
  | 'silent'
  | 'final'
  | 'lunge'
  | 'black'
  | 'wakeUp'
  | 'choice'
  | 'reply'
  | 'out'
  | 'caught'
  | 'done'

export interface TickCtx {
  /** Player z. */
  z: number
}

export const WAKE_FADE = 2.5
export const GET_UP_AT = 3.5
/** The swallow: 0.85 s, the scream at the jolt. Same for the ending and for being caught. */
export const LUNGE_SECONDS = LUNGE_TOTAL
export const STING_AT = JOLT_AT
export const BLACK_SECONDS = 1
export const WAKE_FADE_IN = 1.2
export const OUT_FADE = 1.5
/** Black held after a catch, before the restart. */
export const CAUGHT_BLACK_SECONDS = 1
export const CARRY_FIRST_WHISPER = 7
export const CARRY_WHISPER_EVERY = 16

/** Tension, fear and heart rate to start at. */
export function initialVitals(cp: Checkpoint): { tension: 'CALM' | 'STALK'; fear: number; heartRate: number } {
  return cp === 'wp2' || cp === 'wp3'
    ? { tension: 'CALM', fear: 0.25, heartRate: 84 }
    : { tension: 'STALK', fear: 0.45, heartRate: 95 }
}

const other = (c: Crew): Crew => (c === 'cdr' ? 'cmp' : 'cdr')
const HUNTED_PHASES: ReadonlySet<Phase> = new Set(['explore', 'cage', 'cageOpen', 'carry'])

interface Timer {
  left: number
  fn: () => void
}

export interface Beats {
  start(cp: Checkpoint, startZ: number): void
  tick(dt: number, ctx: TickCtx): void
  /** The player stepped into (true) or out of (false) a hiding spot. */
  hidden(inSpot: boolean): void
  alert(): void
  lost(): void
  caught(): void
  /** E on the cage door. */
  useCage(): void
  /** E on a caged crewman. */
  pickUp(who: Crew): void
  /** E on a bag, with that crewman on the shoulders. */
  layDown(who: Crew): void
  /** E on the second crewman. */
  useSecond(): void
  /** The answer to the choice. Returns false when no choice is open. */
  choose(c: Choice): boolean
  phase(): Phase
  checkpoint(): Checkpoint
  carrying(): Crew | null
  carriedFirst(): Crew | null
  /** The crewman still in the cage once the first one is laid down. */
  second(): Crew | null
  /** Seconds since the lunge began, or null outside it. */
  lungeTime(): number | null
  /** The monster and its brain run: before the silent phase. */
  hunting(): boolean
  /** The player must not move. */
  frozen(): boolean
  choice(): Choice | null
}

export function createBeats(deps: BeatDeps): Beats {
  let phase: Phase = 'wake'
  let cp: Checkpoint = 'start'
  let time = 0
  let prevZ = 0
  let timers: Timer[] = []
  let heldSaid = false
  let impostor = false
  let hunted = false
  let carrying: Crew | null = null
  let first: Crew | null = null
  let lungeT: number | null = null
  let stung = false
  let choice: Choice | null = null
  let whisperIn = 0
  let fade = { dur: 1, on: true }
  let outFade = -1
  let wakeFade = -1

  const after = (secs: number, fn: () => void): void => {
    timers.push({ left: secs, fn })
  }
  const exploreObjective = (): void => deps.setObjective(carrying ? 'act3Carry' : 'act3Find')

  function reachCage(): void {
    phase = 'cage'
    cp = 'wp1'
    deps.checkpoint('wp1')
    deps.say('act3.cage', { from: 'cdr' })
  }

  function goSilent(): void {
    phase = 'silent'
    deps.setSilent(true)
    deps.tension('chaseEnd')
    deps.setObjective('act3Back')
  }

  function beginBlack(): void {
    phase = 'black'
    deps.blackout(1)
    after(BLACK_SECONDS, () => {
      phase = 'wakeUp'
      deps.wakeUp()
      deps.sfx('gasp')
      wakeFade = 0
      after(1.6, () =>
        deps.say('act3.wake.cmp', {
          from: 'player',
          then: () =>
            deps.say('act3.wake.cdr', {
              from: 'player',
              then: () => {
                phase = 'choice'
                deps.openChoice(true)
              },
            }),
        }),
      )
    })
  }

  return {
    start(c, z) {
      cp = c
      time = 0
      prevZ = z
      timers = []
      heldSaid = false
      impostor = c !== 'start' && c !== 'wp0'
      hunted = false
      carrying = null
      first = deps.firstCarried()
      lungeT = null
      stung = false
      choice = null
      whisperIn = 0
      outFade = -1
      wakeFade = -1
      fade = { dur: c === 'start' ? WAKE_FADE : 1, on: true }
      deps.blackout(1)
      if (c === 'start') {
        phase = 'wake'
        // Houston and the commander first, then the signal goes and the dream begins.
        deps.say('act3.around', {
          then: () => {
            if (phase !== 'wake') return
            deps.say('act3.aroundack', {
              from: 'player',
              then: () => {
                if (phase !== 'wake') return
                deps.say('act3.los')
                after(GET_UP_AT, () => {
                  if (phase !== 'wake') return
                  phase = 'explore'
                  deps.getUp()
                  deps.setObjective('act3Find')
                  deps.hint('walk')
                })
              },
            })
          },
        })
      } else if (c === 'wp0') {
        phase = 'explore'
        deps.setObjective('act3Find')
      } else if (c === 'wp1') {
        phase = 'cage'
        deps.setObjective('act3Find')
        after(1, () => deps.say('act3.cage', { from: 'cdr' }))
      } else if (c === 'wp2') {
        phase = 'silent'
        deps.setSilent(true)
        deps.setObjective('act3Back')
      } else {
        phase = 'final'
        deps.setSilent(true)
        deps.setObjective('act3Back')
      }
    },

    tick(dt, ctx) {
      time += dt
      if (fade.on) {
        const v = Math.max(0, 1 - time / fade.dur)
        deps.blackout(v)
        if (v <= 0) fade.on = false
      }
      if (wakeFade >= 0) {
        wakeFade += dt
        deps.blackout(Math.max(0, 1 - wakeFade / WAKE_FADE_IN))
        if (wakeFade >= WAKE_FADE_IN) wakeFade = -1
      }
      if (outFade >= 0) {
        outFade += dt
        deps.blackout(Math.min(1, outFade / OUT_FADE))
        if (outFade >= OUT_FADE) {
          outFade = -1
          phase = 'done'
          deps.complete()
        }
      }
      const due: Timer[] = []
      timers = timers.filter((t) => {
        t.left -= dt
        if (t.left > 0) return true
        due.push(t)
        return false
      })
      due.forEach((t) => t.fn())

      const z = ctx.z
      if (phase === 'explore' || phase === 'cage' || phase === 'cageOpen' || phase === 'carry') {
        const crossed = (thr: number): boolean => prevZ >= thr && z < thr
        if (phase === 'explore') {
          const set = checkpointAt(z)
          if (set === 'wp0' && checkpointIndex(set) > checkpointIndex(cp)) {
            cp = set
            deps.checkpoint(set)
          }
          if (!impostor && crossed(IMPOSTOR_Z)) {
            impostor = true
            deps.anomaly('loss-of-signal')
            deps.say('act3.impostor', { speaker: 'UNKNOWN', detuneHz: 7, from: 'player' })
          }
          if (crossed(CAGE_ARRIVE_Z)) reachCage()
        }
        if (phase === 'carry') {
          whisperIn -= dt
          if (whisperIn <= 0 && carrying) {
            whisperIn = CARRY_WHISPER_EVERY
            deps.say(`act3.carry.${carrying}`, { from: 'player' })
          }
        }
      } else if (phase === 'silent') {
        if (z < CAGE_ARRIVE_Z) {
          phase = 'final'
          cp = 'wp3'
          deps.checkpoint('wp3')
        }
      } else if ((phase === 'lunge' || phase === 'caught') && lungeT !== null) {
        lungeT += dt
        if (!stung && lungeT >= STING_AT) {
          stung = true
          deps.sfx('sting')
        }
        if (lungeT >= LUNGE_SECONDS) {
          lungeT = null
          // The jaws have shut: straight to black, no fade.
          if (phase === 'lunge') beginBlack()
          else {
            deps.blackout(1)
            after(CAUGHT_BLACK_SECONDS, () => deps.restart())
          }
        }
      }
      prevZ = z
    },

    hidden(inSpot) {
      if (inSpot && hunted && !heldSaid) {
        heldSaid = true
        deps.say('act3.hold', { from: 'cdr' })
        deps.hint('breath')
      }
    },

    alert() {
      if (!HUNTED_PHASES.has(phase) || hunted) return
      hunted = true
      deps.say('act3.heard', { urgent: true, from: 'cdr' })
      deps.setObjective('act3Hunted')
      deps.tension('heard')
    },

    lost() {
      if (!HUNTED_PHASES.has(phase) || !hunted) return
      hunted = false
      deps.say('act3.lost', { from: 'player' })
      exploreObjective()
      deps.tension('chaseEnd')
      deps.tension('stalk')
    },

    caught() {
      if (!HUNTED_PHASES.has(phase)) return
      phase = 'caught'
      lungeT = 0
      stung = false
      deps.setObjective(null)
      deps.startLunge()
    },

    useCage() {
      if (phase !== 'cage') return
      phase = 'cageOpen'
      deps.sfx('cage')
      deps.openCage()
    },

    pickUp(who) {
      if (phase !== 'cageOpen') return
      phase = 'carry'
      carrying = who
      first = who
      whisperIn = CARRY_FIRST_WHISPER
      deps.carry(who)
      deps.setObjective('act3Carry')
    },

    layDown(who) {
      if (phase !== 'carry' || carrying !== who) return
      carrying = null
      cp = 'wp2'
      deps.checkpoint('wp2')
      deps.layDown(who)
      deps.say(`act3.down.${who}`, { from: 'player' })
      goSilent()
    },

    useSecond() {
      if (phase !== 'final') return
      phase = 'lunge'
      lungeT = 0
      stung = false
      deps.setObjective(null)
      deps.tension('chaseStart')
      deps.startLunge()
    },

    choose(c) {
      if (phase !== 'choice') return false
      choice = c
      phase = 'reply'
      deps.openChoice(false)
      deps.storeChoice(c)
      deps.say(c === 'dream' ? 'act3.reply.dream' : 'act3.reply.fine', {
        from: 'player',
        then: () => {
          phase = 'out'
          outFade = 0
        },
      })
      return true
    },

    phase: () => phase,
    checkpoint: () => cp,
    carrying: () => carrying,
    carriedFirst: () => first,
    second: () => (first ? other(first) : null),
    lungeTime: () => lungeT,
    hunting: () => HUNTED_PHASES.has(phase),
    frozen: () => ['wake', 'lunge', 'black', 'wakeUp', 'choice', 'reply', 'out', 'caught', 'done'].includes(phase),
    choice: () => choice,
  }
}

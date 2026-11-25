// The act 3 beat flow: wake, encounter, lockers, reveal, chase, hatch, caught.
// Pure: no Three.js or React imports. Every effect goes through `BeatDeps`, time through `tick(dt)`,
// so a test can run the whole act on a fake clock and paused time never counts.
import { createChase, edgeOpacity, isCaught, pushChase, soundInterval, stepChase, type Chase } from '../../director/chase'
import type { TensionEvent } from '../../director/tension'
import { checkpointAt, checkpointIndex, type Checkpoint } from './layout'

export type LookTarget = 'cdr' | 'mike' | 'creature' | 'hatch'
export type ObjectiveKey = 'act3Find' | 'act3Hide' | 'act3Sneak' | 'act3Hunted' | 'act3Chase'

export interface SayOpts {
  urgent?: boolean
  /** Voice comes from Mike's position. */
  fromMike?: boolean
  speaker?: 'UNKNOWN'
  detuneHz?: number
  /** Turn the view to this target, over `secs`, when the line starts. */
  look?: { target: LookTarget; secs: number }
  /** Called when the line ends. */
  then?: () => void
}

export interface BeatDeps {
  say(id: string, opts?: SayOpts): void
  look(target: LookTarget, secs: number): void
  /** Turn to face the hatch (+z) over `secs`. */
  turnToHatch(secs: number): void
  setObjective(key: ObjectiveKey | null): void
  hint(id: string): void
  tension(event: TensionEvent): void
  checkpoint(name: Checkpoint): void
  anomaly(id: string): void
  sfx(name: 'sting' | 'scrape' | 'hatchSlam' | 'knock'): void
  /** A creature footstep or click in the chase. */
  creatureSound(): void
  blackout(v: number): void
  edge(v: number): void
  startEncounter(): void
  /** Show or hide the creature behind Mike. */
  revealCreature(show: boolean): void
  /** The creature crawls after the player, `gap` metres behind. */
  startCrawl(): void
  /** Show or hide the caught flash. */
  flash(show: boolean): void
  restart(): void
  complete(): void
}

export type Phase = 'wake' | 'sneak' | 'reveal' | 'chase' | 'slam' | 'caught' | 'done'

export interface TickCtx {
  /** Player z. */
  z: number
  lookingBack: boolean
}

export const WAKE_FADE = 2.5
export const REVEAL_CHASE_AT = 4.2
export const CAUGHT_SECONDS = 1.5
export const KNOCK_EVERY = 0.9
export const CDR_CALL_START = 3
export const CDR_CALL_EVERY = 7

/** Tension, fear and heart rate to start at. */
export function initialVitals(cp: Checkpoint): { tension: 'STALK' | 'CHASE'; fear: number; heartRate: number } {
  return cp === 'wp3'
    ? { tension: 'CHASE', fear: 0.9, heartRate: 150 }
    : { tension: 'STALK', fear: 0.45, heartRate: 95 }
}

interface Timer {
  left: number
  fn: () => void
}

export interface Beats {
  start(cp: Checkpoint, startZ: number): void
  tick(dt: number, ctx: TickCtx): void
  /** A handrail push. */
  push(): void
  /** The player stepped into (true) or out of (false) a locker. */
  hidden(inLocker: boolean): void
  encounterEnd(): void
  alert(): void
  lost(): void
  caught(): void
  useHatch(): void
  phase(): Phase
  gap(): number
  checkpoint(): Checkpoint
  /** The player must not move: reveal and slam. */
  frozen(): boolean
  hatchEnabled(): boolean
  encounterActive(): boolean
}

export function createBeats(deps: BeatDeps): Beats {
  let phase: Phase = 'wake'
  let cp: Checkpoint = 'start'
  let time = 0
  let prevZ = 0
  let timers: Timer[] = []
  let chase: Chase = createChase()
  let chaseTime = 0
  let nextCall = 0
  let soundIn = 0
  let slamKnock = 0
  let encounter: 'none' | 'active' | 'done' = 'none'
  let heldSaid = false
  let impostor = false
  let call1 = false
  let call2 = false
  let hunted = false
  let lookHint = false
  let fade = { dur: 1, on: true }

  const after = (secs: number, fn: () => void): void => {
    timers.push({ left: secs, fn })
  }
  const sneakObjective = (): void => deps.setObjective('act3Sneak')

  function startEncounter(): void {
    if (encounter !== 'none') return
    encounter = 'active'
    deps.startEncounter()
    deps.sfx('scrape')
    deps.say('act3.see', { urgent: true, look: { target: 'creature', secs: 1.6 } })
    deps.setObjective('act3Hide')
  }

  function startReveal(): void {
    phase = 'reveal'
    deps.setObjective(null)
    deps.say('act3.found', { urgent: true, fromMike: true, look: { target: 'mike', secs: 1.0 } })
    after(1.6, () => {
      deps.revealCreature(true)
      deps.sfx('sting')
      deps.look('creature', 1.2)
    })
    after(2.8, () => {
      deps.say('act3.cmp', { urgent: true, fromMike: true })
      deps.turnToHatch(1.4)
    })
    after(REVEAL_CHASE_AT, beginChase)
  }

  function beginChase(): void {
    if (phase !== 'reveal' && phase !== 'wake') return
    phase = 'chase'
    chase = createChase()
    chaseTime = 0
    nextCall = 0
    soundIn = soundInterval(chase.gap)
    deps.revealCreature(false)
    deps.tension('chaseStart')
    deps.setObjective('act3Chase')
    deps.hint('chase')
    deps.startCrawl()
  }

  function startSlam(): void {
    phase = 'slam'
    deps.sfx('hatchSlam')
    deps.blackout(1)
    deps.edge(0)
    slamKnock = KNOCK_EVERY
    deps.setObjective(null)
    deps.say('act3.slam', { urgent: true })
    deps.say('act3.cmp.plan', { fromMike: false })
    deps.say('act3.cdr.plan', {
      then: () => {
        phase = 'done'
        deps.complete()
      },
    })
  }

  return {
    start(c, z) {
      cp = c
      phase = 'wake'
      time = 0
      prevZ = z
      timers = []
      encounter = 'none'
      heldSaid = false
      impostor = false
      call1 = false
      call2 = false
      hunted = false
      lookHint = false
      fade = { dur: c === 'start' ? WAKE_FADE : 1, on: true }
      deps.blackout(1)
      if (c === 'start') {
        deps.say('act3.los')
        after(1, () =>
          deps.say('act3.wake', {
            look: { target: 'cdr', secs: 1.2 },
            then: () =>
              deps.say('act3.wake2', {
                then: () => {
                  if (phase === 'sneak' && encounter === 'none') {
                    deps.setObjective('act3Find')
                    deps.hint('push')
                  }
                },
              }),
          }),
        )
        phase = 'sneak'
      } else if (c === 'wp0') {
        phase = 'sneak'
        deps.setObjective('act3Find')
        after(1, startEncounter)
      } else if (c === 'wp1' || c === 'wp2') {
        phase = 'sneak'
        sneakObjective()
        encounter = 'done'
      } else {
        phase = 'reveal'
        encounter = 'done'
        deps.say('act3.cmp', { urgent: true, fromMike: true })
        after(0.8, beginChase)
      }
    },

    tick(dt, ctx) {
      time += dt
      if (fade.on) {
        const v = Math.max(0, 1 - time / fade.dur)
        deps.blackout(v)
        if (v <= 0) fade.on = false
      }
      const due: Timer[] = []
      timers = timers.filter((t) => {
        t.left -= dt
        if (t.left > 0) return true
        due.push(t)
        return false
      })
      due.forEach((t) => t.fn())

      if (phase === 'sneak') {
        const z = ctx.z
        const crossed = (thr: number): boolean => prevZ >= thr && z < thr
        const set = checkpointAt(z)
        if (set && checkpointIndex(set) > checkpointIndex(cp)) {
          cp = set
          deps.checkpoint(set)
        }
        if (!call1 && crossed(-1.5)) {
          call1 = true
          deps.say('act3.call1', { fromMike: true })
        }
        if (crossed(-5)) startEncounter()
        if (!impostor && crossed(-12)) {
          impostor = true
          deps.anomaly('impostor-capcom')
          deps.say('act3.impostor', { speaker: 'UNKNOWN', detuneHz: 7, then: () => deps.say('act3.nohouston') })
        }
        if (!call2 && crossed(-24)) {
          call2 = true
          deps.say('act3.call2', { fromMike: true })
        }
        if (crossed(-38)) startReveal()
        prevZ = z
      } else if (phase === 'chase') {
        chaseTime += dt
        chase = stepChase(chase, dt, ctx.lookingBack)
        deps.edge(edgeOpacity(chase.gap))
        if (ctx.lookingBack && !lookHint) {
          lookHint = true
          deps.hint('lookBack')
        }
        const calls = ['act3.cdr.call1', 'act3.cdr.call2', 'act3.cdr.call3']
        if (nextCall < 3 && chaseTime >= CDR_CALL_START + nextCall * CDR_CALL_EVERY) {
          deps.say(calls[nextCall], { urgent: true })
          nextCall++
        }
        soundIn -= dt
        if (soundIn <= 0) {
          soundIn = soundInterval(chase.gap)
          deps.creatureSound()
        }
        if (isCaught(chase)) this.caught()
      } else if (phase === 'slam') {
        slamKnock -= dt
        if (slamKnock <= 0) {
          slamKnock = KNOCK_EVERY
          deps.sfx('knock')
        }
      }
    },

    push() {
      if (phase === 'chase') chase = pushChase(chase)
    },

    hidden(inLocker) {
      if (inLocker && encounter === 'active' && !heldSaid) {
        heldSaid = true
        deps.say('act3.hold')
        deps.hint('breath')
      }
    },

    encounterEnd() {
      if (encounter !== 'active') return
      encounter = 'done'
      if (phase !== 'sneak') return
      sneakObjective()
      deps.say('act3.passed')
    },

    alert() {
      if (phase !== 'sneak') return
      hunted = true
      deps.sfx('sting')
      deps.say('act3.heard', { urgent: true })
      deps.setObjective('act3Hunted')
      deps.tension('heard')
    },

    lost() {
      if (phase !== 'sneak' || !hunted) return
      hunted = false
      deps.say('act3.lost')
      sneakObjective()
      deps.tension('chaseEnd')
      deps.tension('stalk')
    },

    caught() {
      if (phase === 'caught' || phase === 'done' || phase === 'slam') return
      phase = 'caught'
      deps.sfx('sting')
      deps.flash(true)
      deps.edge(0)
      after(CAUGHT_SECONDS, () => {
        deps.flash(false)
        deps.restart()
      })
    },

    useHatch() {
      if (phase === 'chase') startSlam()
    },

    phase: () => phase,
    gap: () => chase.gap,
    checkpoint: () => cp,
    frozen: () => phase === 'reveal' || phase === 'slam' || phase === 'caught',
    hatchEnabled: () => phase === 'chase',
    encounterActive: () => encounter === 'active',
  }
}

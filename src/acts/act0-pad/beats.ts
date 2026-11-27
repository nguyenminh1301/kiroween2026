// The act 0 beat machine. Pure: lines, objectives, camera turns and sounds are injected,
// so a test can drive it on a fake clock. No Three.js or React imports.
import { cheerPeriod } from './crowdLogic'
import { handleAngle, hatchAngle, hatchEvents, hatchFade } from './hatchScene'

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
  setObjective(key: ObjectiveKey | null): void
  showHint(id: string): void
  /** Play the cheer and raise the crowd excitement to at least `level`. */
  cheer(level: number): void
  playSound(name: 'switch' | 'creak' | 'hiss'): void
  /** Handle angle, hatch angle and black level, every frame of the hatch scene. */
  setHatch(handle: number, open: number, fade: number): void
  /** The player boarded: hold the body still. */
  lock(): void
  complete(): void
}

export type CrewId = 'tech1' | 'tech2' | 'gunter'

/** The player is this far along the arm (z below this) when launch control speaks. */
export const ARM_Z = 3.5
export const START_DELAY = 0.8
export const PERIODIC_CHEER = 0.7

export interface Beats {
  tick(dt: number): void
  /** The player used WAVE. */
  wave(): void
  /** The player pressed E on a crew member. */
  talk(who: CrewId): void
  /** The player reached the arm. Launch control reports the countdown once. */
  reachArm(): void
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
  let gunterTalks = 0
  let hatchT = 0
  let counted = false
  let armReached = false
  let introDone = false
  const maybeCount = (): void => {
    if (counted || boarded || !armReached || !introDone) return
    counted = true
    // Pinned to a late beat so the wave and room beats never drop it.
    deps.say('act0.count', { beat: Number.MAX_SAFE_INTEGER }, () => {})
  }
  const hatchQueue = hatchEvents({
    playSound: (n) => deps.playSound(n),
    say: (id) => say(id, { urgent: true }),
    complete: () => deps.complete(),
  })
  let nextHatch = 0
  const talkUntil = new Map<string, number>()
  const go = (n: number): void => {
    beat = n
    deps.setBeat?.(n)
  }

  const say = (id: string, opts: SayOptions, done: () => void = () => {}): void => {
    const b = beat
    deps.say(id, { ...opts, beat: b }, () => {
      if (b === beat && !boarded) done()
    })
  }

  function begin(): void {
    started = true
    deps.showHint('walk')
    say('act0.intro1', {}, () =>
      say('act0.intro2', {}, () => {
        introDone = true
        maybeCount()
        if (!waved) deps.setObjective('act0Wave')
      }),
    )
  }

  return {
    tick(dt) {
      if (boarded) {
        hatchT += dt
        deps.setHatch(handleAngle(hatchT), hatchAngle(hatchT), hatchFade(hatchT))
        while (nextHatch < hatchQueue.length && hatchQueue[nextHatch].at <= hatchT) hatchQueue[nextHatch++].run()
        return
      }
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
      say('act0.wave', {})
      // The intro chain is dropped by the new beat, so launch control may speak now.
      introDone = true
      maybeCount()
    },
    talk(who) {
      if (boarded || (talkUntil.get(who) ?? -1) > clock) return
      // Block repeat presses while the line plays. A dropped line never calls back, so it also expires.
      talkUntil.set(who, clock + 12)
      const id = who === 'tech1' ? 'act0.tech1' : who === 'tech2' ? 'act0.tech2' : gunterTalks++ === 0 ? 'act0.gunter1' : 'act0.gunter2'
      say(id, {}, () => talkUntil.delete(who))
    },
    reachArm() {
      armReached = true
      maybeCount()
    },
    enterRoom() {
      if (inRoom || boarded) return
      inRoom = true
      go(2)
    },
    board() {
      if (boarded) return
      boarded = true
      deps.lock()
      deps.setObjective(null)
    },
    state: () => ({ waved, inRoom, boarded, started }),
  }
}

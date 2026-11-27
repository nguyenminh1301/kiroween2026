import { cleanupRegistry } from '../engine/cleanupRegistry'
import { registerSystem } from '../engine/frameDriver'
import { holdCut } from '../engine/renderHold'
import { gameStore } from '../engine/store'
import { trackTimeline } from '../engine/unloadReset'
import {
  dueEvents,
  evaluateShot,
  interpolateCamera,
  remainingEvents,
  shakeAmplitude,
  sortedEvents,
  type CameraPose,
  type ShotSelection,
  type TimelineDef,
} from './timeline'

/** Runs after player and focus systems so the camera override reflects this frame's time. */
export const TIMELINE_PRIORITY = 500

export interface CameraOverride {
  pose: CameraPose
  fov?: number
  far?: number
}

export interface TimelinePlayerOptions {
  /** Read each step for shake scaling. Defaults to the store setting. */
  reducedMotion?: () => boolean
}

/**
 * Plays one TimelineDef. `step(dt)` is pure bookkeeping; `start()` hooks it into
 * the frame loop as a pausable system, so pausing stops it.
 */
export class TimelinePlayer {
  private t = 0
  private fired = 0
  private done = false
  private lastShot: unknown = null
  private readonly total: number
  private unregister: (() => void) | null = null
  private readonly reducedMotion: () => boolean

  constructor(
    private readonly def: TimelineDef,
    opts: TimelinePlayerOptions = {},
  ) {
    this.total = sortedEvents(def).length
    this.reducedMotion = opts.reducedMotion ?? (() => gameStore.getState().settings.reducedMotion)
  }

  get finished(): boolean {
    return this.done
  }

  get firedCount(): number {
    return this.fired
  }

  /** Timeline time in seconds, for the debug contract. */
  time(): number {
    return this.t
  }

  step(dt: number): void {
    if (this.done) return
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0
    const from = this.t
    const to = Math.min(from + step, this.def.duration)
    this.t = to
    for (const ev of dueEvents(this.def, this.fired, from, to)) {
      this.fired++
      ev.run()
      if (this.done) return
    }
    this.def.onTick?.(to)
    if (this.done) return
    if (to >= this.def.duration) this.finish()
  }

  /** Runs every event not yet fired, once, in order, then ends the timeline. Later calls do nothing. */
  skip(): void {
    if (this.done) return
    const rest = remainingEvents(this.def, this.fired)
    this.fired = this.total
    this.t = Math.max(this.t, this.def.duration)
    this.finish()
    for (const ev of rest) ev.run()
  }

  /** Ends the timeline without firing anything. Used on unload. */
  stop(): void {
    this.finish()
  }

  /** Camera override for the current time, or null to use the player's own camera. */
  camera(): CameraOverride | null {
    if (this.done) return null
    const sel: ShotSelection | null = evaluateShot(this.def.shots, this.t)
    if (sel) {
      if (sel.shot !== this.lastShot) {
        // A cut shows new scenery: the first frames after it are slow and say nothing about the level.
        this.lastShot = sel.shot
        holdCut()
      }
      const out: CameraOverride = { pose: sel.pose }
      if (sel.fov !== undefined) out.fov = sel.fov
      if (sel.far !== undefined) out.far = sel.far
      return out
    }
    const pose = interpolateCamera(this.def.camera, this.t)
    return pose ? { pose } : null
  }

  /** Shake amplitude in metres; zero once finished. */
  shake(): number {
    if (this.done) return 0
    return shakeAmplitude(this.def.shake, this.t, this.reducedMotion())
  }

  /** Registers the pausable frame system and an unload cleanup. Safe to call once. */
  start(): this {
    if (this.unregister || this.done) return this
    this.unregister = registerSystem('timeline', TIMELINE_PRIORITY, (dt) => this.step(dt), { pausable: true })
    cleanupRegistry.register(() => this.stop())
    trackTimeline(this)
    return this
  }

  private finish(): void {
    this.done = true
    if (this.unregister) {
      const u = this.unregister
      this.unregister = null
      u()
    }
  }
}

import type { Line } from '../content/subtitles'
import type { Mood, Speaker, Subtitle, Vec3 } from '../types'
import { LINE_GAP } from './lineTiming'

export interface SayOptions {
  /** Clear the queue and say this line now. */
  urgent?: boolean
  /** The speaker is somewhere in the world. */
  position?: Vec3
  /** Added to both Quindar tones. */
  detuneHz?: number
  /** Show and voice the line as this speaker. */
  speaker?: Speaker
  /** Called when the line appears. */
  onStart?: () => void
}

export interface LineHandle {
  stop(): void
  pause?(): void
  resume?(): void
}

export interface RadioDeps {
  lines: Record<string, Line>
  /** Seconds the line stays up. Called when the line starts. */
  seconds(id: string, line: Line, opts: SayOptions, speaker: Speaker): number
  /** Start the sound of the line. May return null (no audio). */
  start(id: string, line: Line, opts: SayOptions, speaker: Speaker): LineHandle | null
  setSubtitle(subtitle: Subtitle | null): void
}

interface Item {
  id: string
  line: Line
  opts: SayOptions
  resolve: () => void
}

interface Current {
  item: Item
  left: number
  handle: LineHandle | null
}

export interface RadioQueue {
  say(id: string, opts?: SayOptions): Promise<void>
  /** Advance by `dt` seconds of game time. Do not call while paused. */
  tick(dt: number): void
  /** The playing line id first, then the queued ids. */
  ids(): string[]
  pauseAudio(): void
  resumeAudio(): void
  /** End the current line and drop the queue. Every pending promise resolves. */
  clear(): void
}

export function createRadioQueue(deps: RadioDeps): RadioQueue {
  let queue: Item[] = []
  let current: Current | null = null
  let gap = 0
  let key = 0

  const guard = (fn: () => void): void => {
    try {
      fn()
    } catch (err) {
      console.error('radio failed', err)
    }
  }

  function endCurrent(): void {
    const c = current
    if (!c) return
    current = null
    gap = LINE_GAP
    guard(() => c.handle?.stop())
    guard(() => deps.setSubtitle(null))
    c.item.resolve()
  }

  function startNext(): void {
    const item = queue.shift()
    if (!item) return
    const speaker = item.opts.speaker ?? item.line.speaker
    let seconds = 2.4
    guard(() => {
      seconds = deps.seconds(item.id, item.line, item.opts, speaker)
    })
    let handle: LineHandle | null = null
    guard(() => {
      handle = deps.start(item.id, item.line, item.opts, speaker)
    })
    current = { item, left: Number.isFinite(seconds) ? Math.max(0, seconds) : 2.4, handle }
    guard(() =>
      deps.setSubtitle({
        speaker,
        text: item.line.text,
        mood: (item.line.mood ?? null) as Mood | null,
        key: ++key,
      }),
    )
    if (item.opts.onStart) guard(item.opts.onStart)
  }

  function dropQueue(): void {
    const dropped = queue
    queue = []
    for (const i of dropped) i.resolve()
  }

  return {
    say(id, opts = {}) {
      const line = deps.lines[id]
      if (!line) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const item: Item = { id, line, opts, resolve }
        if (opts.urgent) {
          endCurrent()
          dropQueue()
          queue.push(item)
          gap = 0
          startNext()
          return
        }
        queue.push(item)
        if (!current && gap <= 0) startNext()
      })
    },

    tick(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return
      if (current) {
        current.left -= dt
        if (current.left <= 0) endCurrent()
        return
      }
      if (gap > 0) gap -= dt
      if (gap <= 0) startNext()
    },

    ids() {
      return [...(current ? [current.item.id] : []), ...queue.map((i) => i.id)]
    },

    pauseAudio() {
      const h = current?.handle
      if (h?.pause) guard(() => h.pause?.())
    },

    resumeAudio() {
      const h = current?.handle
      if (h?.resume) guard(() => h.resume?.())
    },

    clear() {
      endCurrent()
      dropQueue()
      gap = 0
    },
  }
}

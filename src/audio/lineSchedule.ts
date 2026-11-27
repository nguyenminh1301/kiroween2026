// When each radio line really starts, given when it is said: the queue played on a fake clock.
// Pure: no Web Audio, no Three.js or React imports. 
import type { Line } from '../content/subtitles'
import type { Speaker } from '../types'
import { deliveryKind } from './delivery'
import { groundSeconds, readingSeconds } from './lineTiming'
import { QUINDAR } from './quindar'
import { createRadioQueue, type SayOptions } from './radioQueue'

/** Seconds a line stays up, as the radio counts them. */
export function lineSeconds(line: Line, opts: SayOptions, speaker: Speaker): number {
  const reading = readingSeconds(line)
  switch (deliveryKind(speaker, opts.position !== undefined)) {
    case 'ground':
      return groundSeconds(reading, QUINDAR.seconds)
    default:
      return reading
  }
}

export interface SaidLine {
  at: number
  id: string
  opts?: SayOptions
}

/**
 * Start time of every line part (`id`, then `id+1`, `id+2` for the extra parts) said by `said`, up to `until` s.
 * `onStep` sees the playing and waiting ids after each step.
 */
export function scheduleLines(
  lines: Record<string, Line>,
  said: SaidLine[],
  until: number,
  onStep?: (now: number, ids: string[]) => void,
  step = 0.01,
): Map<string, number> {
  const starts = new Map<string, number>()
  let now = 0
  const radio = createRadioQueue({
    lines,
    seconds: (_id, line, opts, speaker) => lineSeconds(line, opts, speaker),
    start: (id) => {
      if (!starts.has(id)) starts.set(id, now)
      return null
    },
    setSubtitle: () => {},
  })
  const queue = [...said].sort((a, b) => a.at - b.at)
  let k = 0
  for (; now <= until + 1e-9; now += step) {
    while (k < queue.length && queue[k].at <= now + 1e-9) {
      void radio.say(queue[k].id, queue[k].opts)
      k++
    }
    radio.tick(step)
    onStep?.(now, radio.ids())
  }
  return starts
}

// The radio singleton: the pure queue plus the Web Audio delivery of each line.
import { LINES, type Line } from '../content/subtitles'
import { gameStore } from '../engine/store'
import type { Speaker } from '../types'
import { deliveryKind, murmurSyllables } from './delivery'
import { engine } from './engine'
import { playEffect, playTracked } from './play'
import { groundSeconds, readingSeconds, voicedSeconds } from './lineTiming'
import { QUINDAR, quindarFreqs } from './quindar'
import { createRadioQueue, type LineHandle, type SayOptions } from './radioQueue'
import { CHIRP } from './recipes'
import { voKey } from './sampleNames'

function secondsFor(id: string, line: Line, opts: SayOptions, speaker: Speaker): number {
  const reading = readingSeconds(line)
  switch (deliveryKind(speaker, line, opts.position !== undefined)) {
    case 'voiced':
      return voicedSeconds(reading, engine.buffer(voKey(id))?.duration ?? null)
    case 'ground':
      return groundSeconds(reading, QUINDAR.seconds)
    default:
      return reading
  }
}

function quindar(ctx: AudioContext, dest: AudioNode, at: number, hz: number, stops: Array<() => void>): void {
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.value = hz
  const g = ctx.createGain()
  const end = at + QUINDAR.seconds
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(QUINDAR.gain, at + QUINDAR.rampSeconds)
  g.gain.setValueAtTime(QUINDAR.gain, end - QUINDAR.rampSeconds)
  g.gain.linearRampToValueAtTime(0, end)
  o.connect(g)
  g.connect(dest)
  o.start(at)
  o.stop(end + 0.02)
  stops.push(() => o.stop())
}

function noiseSource(ctx: AudioContext, dest: AudioNode, at: number, dur: number, type: BiquadFilterType, f0: number, q: number, gain: number, stops: Array<() => void>): void {
  const buf = engine.noise()
  if (!buf) return
  const s = ctx.createBufferSource()
  s.buffer = buf
  s.loop = true
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = f0
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.03)
  g.gain.setValueAtTime(gain, Math.max(at + 0.03, at + dur - 0.03))
  g.gain.linearRampToValueAtTime(0.0001, at + dur)
  s.connect(f)
  f.connect(g)
  g.connect(dest)
  s.start(at, Math.random())
  s.stop(at + dur + 0.05)
  stops.push(() => s.stop())
}

function start(id: string, line: Line, opts: SayOptions, speaker: Speaker): LineHandle | null {
  const ctx = engine.ctx()
  if (!ctx) return null
  const kind = deliveryKind(speaker, line, opts.position !== undefined)
  const stops: Array<() => void> = []
  const stopAll = (): void => {
    for (const s of stops.splice(0)) {
      try {
        s()
      } catch {
        /* already stopped */
      }
    }
  }
  const untrack = engine.track('radio', stopAll)
  const handle: LineHandle = {
    stop() {
      stopAll()
      untrack()
    },
  }
  const now = ctx.currentTime
  switch (kind) {
    case 'voiced': {
      const buf = engine.buffer(voKey(id))
      const out = engine.output('voice')
      if (!buf || !out) break
      let offset = 0
      let startedAt = now
      let playing: AudioBufferSourceNode | null = null
      const gain = ctx.createGain()
      gain.connect(out.input)
      const play = (): void => {
        const s = ctx.createBufferSource()
        s.buffer = buf
        s.connect(gain)
        playing = s
        s.start(0, offset)
        startedAt = ctx.currentTime
        stops.push(() => s.stop())
      }
      play()
      handle.fadeOut = (seconds) => {
        const t = ctx.currentTime
        gain.gain.cancelScheduledValues(t)
        gain.gain.setValueAtTime(gain.gain.value, t)
        gain.gain.linearRampToValueAtTime(0, t + seconds)
        try {
          playing?.stop(t + seconds + 0.02)
        } catch {
          /* already stopped */
        }
        untrack()
      }
      handle.pause = () => {
        offset = Math.min(buf.duration, offset + (ctx.currentTime - startedAt))
        stopAll()
      }
      handle.resume = () => {
        if (offset < buf.duration) play()
      }
      break
    }
    case 'ground': {
      const out = engine.output('voice')
      if (!out) break
      const reading = readingSeconds(line)
      const f = quindarFreqs(opts.detuneHz)
      quindar(ctx, out.input, now, f.pre, stops)
      noiseSource(ctx, out.input, now + QUINDAR.seconds, reading, 'bandpass', 1800, 1.2, 0.15, stops)
      quindar(ctx, out.input, now + QUINDAR.seconds + reading, f.post, stops)
      break
    }
    case 'murmur': {
      const out = engine.output('voice', opts.position)
      if (!out) break
      for (const sy of murmurSyllables(Math.random)) {
        noiseSource(ctx, out.input, now + sy.at, sy.dur, 'bandpass', sy.freq, 3, 0.7, stops)
      }
      break
    }
    case 'los':
      playEffect('static')
      break
    case 'chirp':
      playTracked('chirp', CHIRP, { bus: 'voice' })
      break
  }
  return handle
}

const queue = createRadioQueue({
  lines: LINES,
  seconds: secondsFor,
  start,
  setSubtitle: (s) => gameStore.getState().setSubtitle(s),
})

/**
 * Say a line and run `done` when it ends. `done` is skipped when the beat moved on meanwhile,
 * because then the line was dropped or cut and the chain it belongs to is stale.
 */
function sayThen(id: string, opts: SayOptions, done: () => void): void {
  const b = queue.beat()
  void queue.say(id, { ...opts, beat: opts.beat ?? b }).then(() => {
    if (queue.beat() === b) done()
  })
}

export const radio = {
  say: queue.say,
  sayThen,
  beat: queue.beat,
  setBeat: queue.setBeat,
  tick: queue.tick,
  ids: queue.ids,
  clear: queue.clear,
  pauseAudio: queue.pauseAudio,
  resumeAudio: queue.resumeAudio,
}

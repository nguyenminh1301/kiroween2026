// Re-entry sound: a rumble and a roar that follow levels set each frame, plus crackle and rattle ticks.
// Synthesized only. The caller supplies levels, so this file holds no timeline.
import { engine } from './engine'
import { playTracked } from './play'
import { CABIN_RATTLE, SHIELD_CRACKLE } from './recipes'

export interface ReentryLevels {
  rumble: number
  roar: number
  crackle: number
  muffle: number
  rattle: number
}

interface Voice {
  gains: { rumble: GainNode; roar: GainNode }
  lowpass: BiquadFilterNode
  stop: () => void
  untrack: () => void
}

let voice: Voice | null = null
let crackleT = 0
let rattleT = 0

function start(): Voice | null {
  const ctx = engine.ctx()
  const bus = engine.bus('ambience')
  const nb = engine.noise()
  if (!ctx || !bus || !nb) return null
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 12000
  lowpass.connect(bus)
  const rumble = ctx.createGain()
  const roar = ctx.createGain()
  rumble.gain.value = 0
  roar.gain.value = 0
  rumble.connect(lowpass)
  roar.connect(lowpass)
  const a = ctx.createBufferSource()
  a.buffer = nb
  a.loop = true
  const low = ctx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 140
  a.connect(low)
  low.connect(rumble)
  const sub = ctx.createOscillator()
  sub.frequency.value = 38
  const subG = ctx.createGain()
  subG.gain.value = 0.5
  sub.connect(subG)
  subG.connect(rumble)
  const b = ctx.createBufferSource()
  b.buffer = nb
  b.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 900
  band.Q.value = 0.5
  b.connect(band)
  band.connect(roar)
  a.start(0, Math.random())
  b.start(0, Math.random() + 0.5)
  sub.start()
  const stop = (): void => {
    for (const s of [a, b, sub]) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    try {
      lowpass.disconnect()
    } catch {
      /* already disconnected */
    }
  }
  return { gains: { rumble, roar }, lowpass, stop, untrack: engine.track('reentry', stop) }
}

function end(): void {
  const v = voice
  voice = null
  if (!v) return
  v.untrack()
  v.stop()
}

engine.onStop(() => {
  voice = null
  crackleT = 0
  rattleT = 0
})

export const reentrySound = {
  /** Set the levels for this frame. `dt` is game seconds. Never throws. */
  set(l: ReentryLevels, dt: number): void {
    try {
      const ctx = engine.ctx()
      if (!ctx) return
      const on = l.rumble > 0 || l.roar > 0
      if (!on) {
        end()
        return
      }
      voice ??= start()
      if (!voice) return
      const now = ctx.currentTime
      voice.gains.rumble.gain.setTargetAtTime(0.9 * l.rumble, now, 0.1)
      voice.gains.roar.gain.setTargetAtTime(0.55 * l.roar, now, 0.1)
      voice.lowpass.frequency.setTargetAtTime(12000 - 11300 * l.muffle, now, 0.2)
      const quiet = 1 - 0.65 * l.muffle
      if (l.crackle > 0) {
        crackleT -= dt
        if (crackleT <= 0) {
          crackleT = (0.05 + Math.random() * 0.25) / l.crackle
          playTracked('crackle', SHIELD_CRACKLE, { bus: 'sfx', gain: l.crackle * 0.7 * quiet })
        }
      }
      if (l.rattle > 0) {
        rattleT -= dt
        if (rattleT <= 0) {
          rattleT = (0.15 + Math.random() * 0.5) / l.rattle
          playTracked('rattle', CABIN_RATTLE, { bus: 'sfx', gain: l.rattle * 0.5 })
        }
      }
    } catch {
      /* audio never throws into the game */
    }
  },
  stop: end,
}

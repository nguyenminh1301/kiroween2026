// Ambience scene, breathing, heartbeat and tension layers. One looping source per channel,
// sample first with a synthesized loop as the stand-in. Nothing here throws.
import { gameStore } from '../engine/store'
import { breathEnvelope, breathRate, heartbeatLevel } from './bodyMath'
import { engine, type BusName } from './engine'
import { makeLoopData, type LoopKind } from './loopSynth'
import { playTracked } from './play'
import { BIRD_CHIRPS, HEART_THUMP } from './recipes'
import { BREATH_LEVEL, DEFAULT_SCENE, resolveScene, type AmbienceScene } from './scene'
import { tensionLevels } from './tension'
import type { TensionState } from '../types'

export const SCENE_FADE = 1.5
export const TENSION_FADE = 2

interface Playing {
  s: AudioBufferSourceNode
  sg: GainNode
  untrack: () => void
}

interface Channel {
  key: string
  bus: BusName
  kind: LoopKind
  file: string | null
  filter?: { type: BiquadFilterType; f: number; q: number }
  node: GainNode | null
  cur: Playing | null
  sample: boolean
  level: number
}

const channel = (key: string, bus: BusName, kind: LoopKind, file: string | null, filter?: Channel['filter']): Channel => ({
  key, bus, kind, file, filter, node: null, cur: null, sample: false, level: 0,
})

const ch = {
  hum: channel('hum', 'ambience', 'hum', 'ship_hum_loop'),
  vent: channel('vent', 'ambience', 'vent', 'vent_loop'),
  wind: channel('wind', 'ambience', 'wind', 'pad_wind_loop'),
  ocean: channel('ocean', 'ambience', 'ocean', 'ocean_loop'),
  heli: channel('heli', 'ambience', 'heli', 'helicopter_loop'),
  steps: channel('steps', 'ambience', 'steps', 'footsteps_grating'),
  breath: channel('breath', 'body', 'noise', 'helmet_breath_loop', { type: 'bandpass', f: 700, q: 0.8 }),
  heartbeat: channel('heartbeat', 'body', 'noise', 'heartbeat_loop'),
  drone: channel('drone', 'ambience', 'drone', 'drone_loop'),
  pulse: channel('pulse', 'ambience', 'pulse', 'chase_loop'),
}
const all = Object.values(ch)

const SILENT: AmbienceScene = { ...DEFAULT_SCENE, hum: 0, bed: 'none', breath: false, birds: false }
let scene: AmbienceScene = { ...DEFAULT_SCENE }
let tensionSeen: TensionState = 'CALM'
let whine: { a: OscillatorNode; b: OscillatorNode; node: GainNode; untrack: () => void } | null = null
const synthCache = new Map<LoopKind, AudioBuffer>()
let phase = 0
let birdT = 2
let beatT = 0
let lastHeart = -1

function synthBuffer(ctx: AudioContext, kind: LoopKind): AudioBuffer {
  let b = synthCache.get(kind)
  if (!b) {
    const data = makeLoopData(kind, ctx.sampleRate)
    b = ctx.createBuffer(1, data.length, ctx.sampleRate)
    b.getChannelData(0).set(data)
    synthCache.set(kind, b)
  }
  return b
}

function startSource(c: Channel, fade: number): void {
  const ctx = engine.ctx()
  const bus = engine.bus(c.bus)
  if (!ctx || !bus) return
  if (!c.node) {
    c.node = ctx.createGain()
    c.node.gain.value = 0
    c.node.connect(bus)
  }
  const now = ctx.currentTime
  const sample = c.file ? engine.buffer(c.file) : null
  const buf = sample ?? synthBuffer(ctx, c.kind)
  const s = ctx.createBufferSource()
  s.buffer = buf
  s.loop = true
  const sg = ctx.createGain()
  sg.gain.setValueAtTime(fade > 0 ? 0 : 1, now)
  if (fade > 0) sg.gain.setTargetAtTime(1, now, fade / 3)
  let node: AudioNode = s
  if (c.filter && !sample) {
    const f = ctx.createBiquadFilter()
    f.type = c.filter.type
    f.frequency.value = c.filter.f
    f.Q.value = c.filter.q
    s.connect(f)
    node = f
  }
  node.connect(sg)
  sg.connect(c.node)
  s.start(0, Math.random() * buf.duration)
  const untrack = engine.track(c.key, () => {
    try {
      s.stop()
    } catch {
      /* already stopped */
    }
  })
  c.cur = { s, sg, untrack }
  c.sample = sample !== null
}

function stopSource(c: Channel, fade: number): void {
  const cur = c.cur
  const ctx = engine.ctx()
  c.cur = null
  if (!cur || !ctx) return
  cur.untrack()
  try {
    cur.sg.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade / 3))
    cur.s.stop(ctx.currentTime + fade + 0.2)
  } catch {
    /* already stopped */
  }
}

function setLevel(c: Channel, level: number, fade: number): void {
  const ctx = engine.ctx()
  if (!ctx) return
  c.level = level
  if (level > 0 && !c.cur) startSource(c, fade)
  c.node?.gain.setTargetAtTime(level, ctx.currentTime, Math.max(0.01, fade / 3))
  if (level <= 0 && c.cur) stopSource(c, fade)
}

function bedFile(bed: AmbienceScene['bed']): string | null {
  return bed === 'ship' ? 'ship_hum_loop' : bed === 'engine' ? 'engine_room_loop' : null
}

function applyScene(): void {
  if (!engine.ctx()) return
  const next = bedFile(scene.bed)
  if (next !== null && ch.hum.file !== next) {
    ch.hum.file = next
    if (ch.hum.cur) {
      stopSource(ch.hum, SCENE_FADE)
      startSource(ch.hum, SCENE_FADE)
    }
  }
  setLevel(ch.hum, next ? scene.hum : 0, SCENE_FADE)
  setLevel(ch.vent, scene.vent, SCENE_FADE)
  setLevel(ch.wind, scene.wind, SCENE_FADE)
  setLevel(ch.ocean, scene.ocean, SCENE_FADE)
  setLevel(ch.heli, scene.heli, SCENE_FADE)
  setLevel(ch.steps, scene.steps, SCENE_FADE)
  if (scene.breath) {
    if (!ch.breath.cur) {
      startSource(ch.breath, 0.5)
      ch.breath.node?.gain.setValueAtTime(1, engine.ctx()?.currentTime ?? 0)
    }
  } else if (ch.breath.cur) stopSource(ch.breath, 0.5)
}

function setTensionLevels(state: TensionState): void {
  const lv = tensionLevels(state)
  setLevel(ch.drone, lv.drone, TENSION_FADE)
  setLevel(ch.pulse, lv.pulse, TENSION_FADE)
  setWhine(lv.whine)
}

function setWhine(level: number): void {
  const ctx = engine.ctx()
  const bus = engine.bus('ambience')
  if (!ctx || !bus) return
  const now = ctx.currentTime
  if (level > 0 && !whine) {
    const node = ctx.createGain()
    node.gain.value = 0
    node.connect(bus)
    const a = ctx.createOscillator()
    const b = ctx.createOscillator()
    a.frequency.value = 2200
    b.frequency.value = 2207
    a.connect(node)
    b.connect(node)
    a.start()
    b.start()
    const stop = (): void => {
      try {
        a.stop()
        b.stop()
      } catch {
        /* already stopped */
      }
    }
    whine = { a, b, node, untrack: engine.track('whine', stop) }
  }
  if (!whine) return
  whine.node.gain.setTargetAtTime(level * 0.1, now, TENSION_FADE / 3)
  if (level <= 0) {
    const w = whine
    whine = null
    w.untrack()
    try {
      w.a.stop(now + TENSION_FADE + 0.2)
      w.b.stop(now + TENSION_FADE + 0.2)
    } catch {
      /* already stopped */
    }
  }
}

/** When a sample finishes decoding, swap any channel still running on its stand-in. */
function onLoaded(name: string): void {
  for (const c of all) {
    if (c.cur && !c.sample && c.file === name) {
      stopSource(c, 0.3)
      startSource(c, 0.3)
    }
  }
}

function reset(): void {
  for (const c of all) {
    c.cur = null
    c.node = null
    c.sample = false
    c.level = 0
  }
  whine = null
  scene = { ...SILENT }
  tensionSeen = 'CALM'
  lastHeart = -1
  synthCache.clear()
}

engine.onReady(() => {
  applyScene()
  setTensionLevels(gameStore.getState().tension)
})
engine.onLoaded(onLoaded)
engine.onStop(reset)

export const ambience = {
  /** Set the scene. Fields left out go back to their defaults. */
  setScene(partial: Partial<AmbienceScene> = {}): void {
    try {
      scene = resolveScene(partial)
      applyScene()
    } catch {
      /* never throws */
    }
  },

  getScene: (): AmbienceScene => scene,

  /** Per frame, game time. Breathing, heartbeat, birds and tension changes. */
  tick(dt: number): void {
    try {
      const ctx = engine.ctx()
      if (!ctx) return
      const s = gameStore.getState()
      const now = ctx.currentTime

      const rate = breathRate(s.heartRate)
      phase = (phase + (dt * rate) / 60) % 1
      if (ch.breath.cur && ch.breath.node) {
        const on = scene.breath && !s.holdingBreath
        const level = on ? BREATH_LEVEL * (ch.breath.sample ? 0.8 : 0.9 * breathEnvelope(phase)) : 0
        ch.breath.node.gain.setTargetAtTime(level, now, 0.08)
        if (ch.breath.sample) ch.breath.cur.s.playbackRate.setTargetAtTime(Math.min(2.5, Math.max(0.5, rate / 12)), now, 0.2)
      }

      const heart = heartbeatLevel(s.heartRate)
      const heartSample = engine.isLoaded('heartbeat_loop')
      if (heartSample) {
        if (heart !== lastHeart || (heart > 0 && !ch.heartbeat.cur)) {
          lastHeart = heart
          setLevel(ch.heartbeat, heart, 0.5)
        }
      } else if (heart > 0) {
        beatT -= dt
        if (beatT <= 0) {
          beatT += 60 / s.heartRate
          playTracked('heartbeat', HEART_THUMP, { bus: 'body', gain: heart * 0.9 })
        }
      }

      if (scene.birds) {
        birdT -= dt
        if (birdT <= 0) {
          birdT = 2 + Math.random() * 4
          const r = BIRD_CHIRPS[Math.floor(Math.random() * BIRD_CHIRPS.length)]
          playTracked('birds', r, { bus: 'ambience', gain: 0.6 })
        }
      }

      if (s.tension !== tensionSeen) {
        tensionSeen = s.tension
        setTensionLevels(s.tension)
      }
    } catch {
      /* never throws */
    }
  },
}

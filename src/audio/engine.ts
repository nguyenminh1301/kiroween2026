// The only file that creates the AudioContext. Every function is safe to call at any
// time: with no context (blocked, unsupported, not unlocked yet) it does nothing.
import { gameStore } from '../engine/store'
import type { Vec3 } from '../types'
import { SAMPLE_NAMES } from './sampleNames'
import { assetUrl } from './assetUrl'

export type BusName = 'ambience' | 'sfx' | 'voice' | 'body'

export const BUS_GAIN: Record<BusName, number> = { ambience: 0.5, sfx: 0.8, voice: 0.9, body: 0.7 }
export const PAUSE_AMBIENCE = 0.3
export const MASTER_RAMP = 0.05

interface Track {
  name: string
  stop: () => void
}

let ctx: AudioContext | null = null
let failed = false
let master: GainNode | null = null
let buses: Record<BusName, GainNode> | null = null
let noise: AudioBuffer | null = null
let loadStarted = false
const buffers = new Map<string, AudioBuffer>()
const tracks = new Set<Track>()
const readyHooks = new Set<() => void>()
const stopHooks = new Set<() => void>()
const loadedHooks = new Set<(name: string) => void>()

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function applyPause(paused: boolean): void {
  safe(() => {
    if (!ctx || !buses) return
    const g = buses.ambience.gain
    const target = BUS_GAIN.ambience * (paused ? PAUSE_AMBIENCE : 1)
    g.cancelScheduledValues(ctx.currentTime)
    g.setValueAtTime(g.value, ctx.currentTime)
    g.linearRampToValueAtTime(target, ctx.currentTime + 0.1)
  }, undefined)
}

function setMaster(volume: number): void {
  safe(() => {
    if (!ctx || !master) return
    const v = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.linearRampToValueAtTime(v, ctx.currentTime + MASTER_RAMP)
  }, undefined)
}

function build(): void {
  const Ctor: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) {
    failed = true
    return
  }
  const c = new Ctor()
  const m = c.createGain()
  m.gain.value = gameStore.getState().settings.volume
  m.connect(c.destination)
  const make = (name: BusName): GainNode => {
    const g = c.createGain()
    g.gain.value = BUS_GAIN[name]
    g.connect(m)
    return g
  }
  ctx = c
  master = m
  buses = { ambience: make('ambience'), sfx: make('sfx'), voice: make('voice'), body: make('body') }
  let lastVolume = gameStore.getState().settings.volume
  let lastPaused = gameStore.getState().paused
  gameStore.subscribe((s) => {
    if (s.settings.volume !== lastVolume) {
      lastVolume = s.settings.volume
      setMaster(lastVolume)
    }
    if (s.paused !== lastPaused) {
      lastPaused = s.paused
      applyPause(lastPaused)
    }
  })
  applyPause(lastPaused)
}

async function loadOne(key: string, url: string): Promise<void> {
  try {
    const c = ctx
    if (!c) return
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.arrayBuffer()
    const buf = await c.decodeAudioData(data)
    buffers.set(key, buf)
    for (const h of [...loadedHooks]) safe(() => h(key), undefined)
  } catch {
    // A failed fetch or decode leaves the name missing.
  }
}

function startLoading(): void {
  if (loadStarted) return
  loadStarted = true
  for (const name of SAMPLE_NAMES) void loadOne(name, assetUrl(`audio/${name}.mp3`))
}

export const engine = {
  /** Create and resume the context. Call from a user gesture. Safe to call again. */
  unlock(): void {
    safe(() => {
      if (failed) return
      const fresh = ctx === null
      if (fresh) build()
      if (!ctx) return
      void ctx.resume().catch(() => {})
      if (fresh) {
        startLoading()
        for (const h of [...readyHooks]) safe(h, undefined)
      }
    }, undefined)
  },

  ctx: (): AudioContext | null => ctx,
  bus: (name: BusName): GainNode | null => buses?.[name] ?? null,
  buffer: (name: string): AudioBuffer | null => buffers.get(name) ?? null,
  isLoaded: (name: string): boolean => buffers.has(name),
  loaded: (): string[] => [...buffers.keys()],

  /** A shared 2 s buffer of white noise, or null with no context. */
  noise(): AudioBuffer | null {
    return safe(() => {
      if (!ctx) return null
      if (noise) return noise
      const n = Math.floor(ctx.sampleRate * 2)
      const b = ctx.createBuffer(1, n, ctx.sampleRate)
      const d = b.getChannelData(0)
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
      noise = b
      return b
    }, null)
  },

  /** An input node for a source: plain gain into the bus, or an HRTF panner at `position`. */
  output(bus: BusName, position?: Vec3): { input: AudioNode; release: () => void } | null {
    return safe(() => {
      if (!ctx || !buses) return null
      const g = ctx.createGain()
      if (!position) {
        g.connect(buses[bus])
        return { input: g, release: () => safe(() => g.disconnect(), undefined) }
      }
      const p = ctx.createPanner()
      p.panningModel = 'HRTF'
      p.distanceModel = 'inverse'
      p.refDistance = 3
      if (p.positionX) {
        p.positionX.value = position.x
        p.positionY.value = position.y
        p.positionZ.value = position.z
      } else {
        p.setPosition(position.x, position.y, position.z)
      }
      g.connect(p)
      p.connect(buses[bus])
      return {
        input: g,
        release: () =>
          safe(() => {
            g.disconnect()
            p.disconnect()
          }, undefined),
      }
    }, null)
  },

  /** Register something that is sounding. `stop` is called by `stopAll`. Returns the untrack function. */
  track(name: string, stop: () => void): () => void {
    const t: Track = { name, stop }
    tracks.add(t)
    return () => {
      tracks.delete(t)
    }
  },

  playing: (): string[] => [...new Set([...tracks].map((t) => t.name))],

  /** Run once the context exists (at once if it already does). */
  onReady(fn: () => void): () => void {
    readyHooks.add(fn)
    if (ctx) safe(fn, undefined)
    return () => readyHooks.delete(fn)
  },
  onStop(fn: () => void): () => void {
    stopHooks.add(fn)
    return () => stopHooks.delete(fn)
  },
  onLoaded(fn: (name: string) => void): () => void {
    loadedHooks.add(fn)
    return () => loadedHooks.delete(fn)
  },

  /** Cut every source. */
  stopAll(): void {
    const all = [...tracks]
    tracks.clear()
    for (const t of all) safe(t.stop, undefined)
    for (const h of [...stopHooks]) safe(h, undefined)
  },

  /** Move the listener to the player's eye. Yaw and pitch in radians, camera looks down -Z at yaw 0. */
  setListener(pos: Vec3, yaw: number, pitch: number): void {
    safe(() => {
      if (!ctx) return
      const l = ctx.listener
      const fx = -Math.sin(yaw) * Math.cos(pitch)
      const fy = Math.sin(pitch)
      const fz = -Math.cos(yaw) * Math.cos(pitch)
      if (l.positionX) {
        l.positionX.value = pos.x
        l.positionY.value = pos.y
        l.positionZ.value = pos.z
        l.forwardX.value = fx
        l.forwardY.value = fy
        l.forwardZ.value = fz
        l.upX.value = 0
        l.upY.value = 1
        l.upZ.value = 0
      } else {
        l.setPosition(pos.x, pos.y, pos.z)
        l.setOrientation(fx, fy, fz, 0, 1, 0)
      }
    }, undefined)
  },
}

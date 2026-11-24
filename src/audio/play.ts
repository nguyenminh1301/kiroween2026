import { gameStore } from '../engine/store'
import type { Vec3 } from '../types'
import { engine, type BusName } from './engine'
import { EFFECTS, pickEffectFile, type EffectName } from './effects'
import { RECIPES, type Recipe } from './recipes'

export interface PlayOptions {
  position?: Vec3
  gain?: number
  rate?: number
  bus?: BusName
}

/**
 * Schedule a recipe on `dest` at `t0`. Returns the sources so the caller can stop them,
 * and the time the last layer ends.
 */
export function playRecipe(
  ctx: AudioContext,
  dest: AudioNode,
  recipe: Recipe,
  t0: number,
  gain = 1,
): { sources: AudioScheduledSourceNode[]; end: number } {
  const sources: AudioScheduledSourceNode[] = []
  let end = t0
  const nb = engine.noise()
  for (const l of recipe) {
    const t = t0 + l.at
    const stopAt = t + l.dur + 0.05
    let src: AudioScheduledSourceNode
    if (l.kind === 'osc') {
      const o = ctx.createOscillator()
      o.type = l.wave ?? 'sine'
      const f0 = l.f0 ?? 440
      o.frequency.setValueAtTime(f0, t)
      if (l.f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1, l.f1), t + l.dur)
      src = o
    } else {
      if (!nb) continue
      const s = ctx.createBufferSource()
      s.buffer = nb
      s.loop = true
      src = s
      s.start(t, Math.random() * 1.5)
    }
    let node: AudioNode = src
    if (l.filter) {
      const f = ctx.createBiquadFilter()
      f.type = l.filter.type
      f.frequency.setValueAtTime(l.filter.f, t)
      if (l.filter.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(10, l.filter.f1), t + l.dur)
      f.Q.value = l.filter.q ?? 1
      node.connect(f)
      node = f
    }
    const g = ctx.createGain()
    const peak = l.gain * gain
    const attack = Math.min(l.attack ?? 0.005, l.dur * 0.8)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + l.dur)
    node.connect(g)
    g.connect(dest)
    if (l.kind === 'osc') (src as OscillatorNode).start(t)
    src.stop(stopAt)
    sources.push(src)
    end = Math.max(end, stopAt)
  }
  return { sources, end }
}

/** Play a recipe on a bus and track it by `name` until its last source ends. */
export function playTracked(
  name: string,
  recipe: Recipe,
  opts: PlayOptions & { bus?: BusName } = {},
  existing?: { input: AudioNode; release: () => void } | null,
): void {
  try {
    const ctx = engine.ctx()
    if (!ctx) return
    const out = existing ?? engine.output(opts.bus ?? 'sfx', opts.position)
    if (!out) return
    const { sources } = playRecipe(ctx, out.input, recipe, ctx.currentTime, opts.gain ?? 1)
    let left = sources.length
    const untrack = engine.track(name, () => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          /* already stopped */
        }
      }
      out.release()
    })
    if (left === 0) {
      untrack()
      out.release()
    }
    for (const src of sources) {
      src.onended = () => {
        if (--left === 0) {
          untrack()
          out.release()
        }
      }
    }
  } catch {
    // Audio never throws into the game.
  }
}

/**
 * Play a named effect: a random loaded file, otherwise the synthesized stand-in.
 * Does nothing while the game is paused or when there is no audio. Never throws.
 */
export function playEffect(name: EffectName, opts: PlayOptions = {}): void {
  try {
    if (gameStore.getState().paused) return
    const ctx = engine.ctx()
    const def = EFFECTS[name]
    if (!ctx || !def) return
    const out = engine.output(opts.bus ?? 'sfx', opts.position)
    if (!out) return
    const gain = def.gain * (Number.isFinite(opts.gain) ? (opts.gain as number) : 1)
    const file = pickEffectFile(name, engine.isLoaded)
    const buf = file ? engine.buffer(file) : null
    if (buf) {
      const s = ctx.createBufferSource()
      s.buffer = buf
      if (opts.rate !== undefined && Number.isFinite(opts.rate)) s.playbackRate.value = opts.rate
      const g = ctx.createGain()
      g.gain.value = gain
      s.connect(g)
      g.connect(out.input)
      let untrack = (): void => {}
      s.onended = () => {
        untrack()
        out.release()
      }
      untrack = engine.track(name, () => {
        try {
          s.stop()
        } catch {
          /* already stopped */
        }
        out.release()
      })
      s.start()
      return
    }
    playTracked(name, RECIPES[name], { ...opts, gain, bus: undefined }, out)
  } catch {
    // Audio never throws into the game.
  }
}

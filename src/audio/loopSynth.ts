// Looping stand-ins for the recorded loops. Pure: fills a Float32Array. Every periodic part
// uses a whole number of cycles over the loop length, so the loop does not click at the seam.
export type LoopKind = 'hum' | 'vent' | 'wind' | 'ocean' | 'heli' | 'steps' | 'drone' | 'pulse' | 'noise'

export const HUM_FREQS = [55, 110.5, 164.8] as const

/** Loop length in seconds. The hum is 10 s so that 110.5 and 164.8 Hz complete whole cycles. */
export function loopSeconds(kind: LoopKind): number {
  return kind === 'hum' ? 10 : 4
}

function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Noise through a one-pole low-pass. `a` near 0 is dark, near 1 is bright. */
function lowNoise(n: number, a: number, rand: () => number): Float32Array {
  const out = new Float32Array(n)
  let y = 0
  for (let i = 0; i < n; i++) {
    y += a * (rand() * 2 - 1 - y)
    out[i] = y
  }
  return out
}

export function makeLoopData(kind: LoopKind, sampleRate: number): Float32Array {
  const sr = Number.isFinite(sampleRate) && sampleRate > 1000 ? sampleRate : 44100
  const n = Math.floor(loopSeconds(kind) * sr)
  const rand = rng(kind.length * 7919 + 13)
  const out = new Float32Array(n)
  const T = 2 * Math.PI
  switch (kind) {
    case 'hum': {
      const nz = lowNoise(n, 0.03, rand)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        out[i] =
          0.3 * Math.sin(T * 55 * t) + 0.22 * Math.sin(T * 110.5 * t) + 0.12 * Math.sin(T * 164.8 * t) + 1.5 * nz[i]
      }
      break
    }
    case 'vent': {
      const hi = lowNoise(n, 0.25, rand)
      const lo = lowNoise(n, 0.03, rand)
      for (let i = 0; i < n; i++) out[i] = 1.2 * (hi[i] - lo[i])
      break
    }
    case 'wind': {
      const nz = lowNoise(n, 0.04, rand)
      for (let i = 0; i < n; i++) out[i] = 3 * nz[i] * (0.6 + 0.4 * Math.sin((T * 2 * i) / n))
      break
    }
    case 'ocean': {
      const nz = lowNoise(n, 0.06, rand)
      for (let i = 0; i < n; i++) out[i] = 3 * nz[i] * (0.55 + 0.45 * Math.sin((T * i) / n))
      break
    }
    case 'heli': {
      const nz = lowNoise(n, 0.12, rand)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        const beat = 0.5 + 0.5 * Math.sin(T * 11 * t)
        out[i] = 0.5 * nz[i] * beat * beat + 0.2 * Math.sin(T * 55 * t) * beat
      }
      break
    }
    case 'steps': {
      const nz = lowNoise(n, 0.3, rand)
      const period = Math.floor(sr * 0.5)
      const burst = Math.floor(sr * 0.09)
      for (let i = 0; i < n; i++) {
        const k = i % period
        if (k < burst) out[i] = nz[i] * Math.exp((-6 * k) / burst) * 1.5
      }
      break
    }
    case 'drone': {
      const nz = lowNoise(n, 0.02, rand)
      for (let i = 0; i < n; i++) {
        const t = i / sr
        out[i] = 0.4 * Math.sin(T * 40 * t) + 0.25 * Math.sin(T * 60.25 * t) + 1.2 * nz[i]
      }
      break
    }
    case 'pulse': {
      const period = Math.floor(sr * 0.25)
      for (let i = 0; i < n; i++) {
        const k = i % period
        const accent = Math.floor(i / period) % 2 === 0 ? 1 : 0.6
        const t = k / sr
        out[i] = accent * Math.sin(T * 55 * t) * Math.exp(-14 * t)
      }
      break
    }
    case 'noise':
      for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1
      break
  }
  // Keep every stand-in under full scale.
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]))
  if (peak > 0.95) for (let i = 0; i < n; i++) out[i] *= 0.9 / peak
  return out
}

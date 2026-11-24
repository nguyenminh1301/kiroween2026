/** Pure mirrors of the PS1 shader steps. */

export function fringeOffset(u: number, v: number, fringe: number): { x: number; y: number } {
  return { x: (u - 0.5) * fringe * 0.012, y: (v - 0.5) * fringe * 0.012 }
}

/** Sample positions: red at uv - offset, green at uv, blue at uv + offset. */
export function fringeSamples(u: number, v: number, fringe: number) {
  const o = fringeOffset(u, v, fringe)
  return {
    r: { x: u - o.x, y: v - o.y },
    g: { x: u, y: v },
    b: { x: u + o.x, y: v + o.y },
  }
}

export function vignetteMul(u: number, v: number, vignette: number): number {
  const vx = u * 2 - 1
  const vy = v * 2 - 1
  return Math.min(1, Math.max(0, 1 - (vx * vx + vy * vy) * vignette * 0.55))
}

export function toGamma(c: number): number {
  return Math.pow(Math.max(0, c), 1 / 2.2)
}

export function toLinear(c: number): number {
  return Math.pow(Math.max(0, c), 2.2)
}

/** Cheap per-pixel hash in [0, 1). */
export function hash2(px: number, py: number, seed: number): number {
  const s = Math.sin(px * 12.9898 + py * 78.233 + seed * 37.719) * 43758.5453
  return s - Math.floor(s)
}

/** Grain term added in gamma space. Bounded by noise * 0.015. */
export function grainTerm(px: number, py: number, seed: number, noise: number): number {
  return (hash2(px, py, seed) - 0.5) * noise * 0.03
}

export function grainSeed(gameTimeSeconds: number): number {
  return Math.floor(gameTimeSeconds * 24)
}

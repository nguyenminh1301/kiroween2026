/** Seeded RNG (mulberry32). Returns numbers in [0, 1). No Math.random, no DOM. */
export function toSeed32(seed: number): number {
  if (typeof seed !== 'number' || !Number.isFinite(seed)) return 0
  return Math.trunc(seed) | 0
}

export function createRng(seed: number): () => number {
  let a = toSeed32(seed) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

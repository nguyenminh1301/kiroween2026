/** Pure cache key for a texture name and seed. Distinct pairs give distinct keys. */
export function cacheKey(name: string, seed: number): string {
  return `${name.length}:${name}|${Object.is(seed, -0) ? '-0' : String(seed)}`
}

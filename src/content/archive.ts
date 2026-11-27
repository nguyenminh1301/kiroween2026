/**
 * The eight real moments the game can show. Acts report them with `addAnomalySeen(id)`.
 * Their text lives in the article page (`index.html`, section "What really happened"),
 * and `src/article/article.test.ts` checks that every id is there.
 */
export const MOMENT_IDS = [
  'escape-tower',
  'loss-of-signal',
  'alarm-1202',
  'eagle-landed',
  'seismo-steps',
  'flag-knocked',
  'burn-routine',
  'hornet',
] as const

export type MomentId = (typeof MOMENT_IDS)[number]

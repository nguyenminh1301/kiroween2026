// URLs for the e2e scripts. GAME_URL only gives the origin and the query (for example ?debug).
const given = new URL(process.env.GAME_URL ?? 'http://localhost:5173/?debug')

/** The game page, with the query of GAME_URL. Pass `null` to drop the query. */
export function gameUrl(search = given.search) {
  return `${given.origin}/play.html${search ?? ''}`
}

/** The article page, optionally at a section. */
export function articleUrl(hash = '') {
  return `${given.origin}/${hash ? `#${hash}` : ''}`
}

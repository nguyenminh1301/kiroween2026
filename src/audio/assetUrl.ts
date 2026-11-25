/**
 * URL of a file in `public/`, relative to the Vite base, so the built game
 * also loads its audio when served from a sub-path (base './').
 */
export function assetUrl(path: string, base: string = import.meta.env.BASE_URL): string {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return prefix + path.replace(/^\/+/, '')
}

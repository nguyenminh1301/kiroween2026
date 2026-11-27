import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const MB = 1024 * 1024
export const DEFAULT_LIMITS = { entry: 5 * MB, dynamic: 4 * MB, total: 25 * MB, article: 300 * 1024 }

const fmt = (n) => `${(n / MB).toFixed(2)} MB (${n} bytes)`

function dirSize(dir) {
  let sum = 0
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    sum += st.isDirectory() ? dirSize(full) : st.size
  }
  return sum
}

/**
 * Measure a Vite build against the size budget. Each HTML entry is measured on its own with its
 * static imports. When both `index.html` (article) and `play.html` (game) exist, the article
 * uses `limits.article` and the game uses `limits.entry`. A build with one entry uses `limits.entry`.
 * @param {string} distDir
 * @param {{ entry: number, dynamic: number, total: number, article?: number }} [limits]
 * @returns {{ entry: { name: string, size: number } | null, article: { name: string, size: number } | null, dynamic: { name: string, size: number }[], total: number, failures: string[] }}
 */
export function checkBudget(distDir, limits = DEFAULT_LIMITS) {
  const result = { entry: null, article: null, dynamic: [], total: 0, failures: [] }
  const manifestPath = join(distDir, '.vite', 'manifest.json')
  if (!existsSync(manifestPath)) {
    result.failures.push(`manifest not found: ${manifestPath}`)
    return result
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const fileSize = (f) => statSync(join(distDir, f)).size
  const chunkFiles = (item) => [item.file, ...(item.css ?? [])]

  const entryKeys = Object.keys(manifest).filter((k) => manifest[k].isEntry)
  if (entryKeys.length === 0) {
    result.failures.push('no entry chunk in manifest')
    return result
  }
  const twoPages = entryKeys.includes('index.html') && entryKeys.includes('play.html')
  const articleLimit = limits.article ?? DEFAULT_LIMITS.article

  for (const entryKey of entryKeys) {
    // Entry chunk plus its static imports, each file counted once.
    const seen = new Set()
    const files = new Set()
    const visit = (key) => {
      if (seen.has(key) || !manifest[key]) return
      seen.add(key)
      chunkFiles(manifest[key]).forEach((f) => files.add(f))
      ;(manifest[key].imports ?? []).forEach(visit)
    }
    visit(entryKey)
    const size = [...files].reduce((s, f) => s + fileSize(f), 0)
    const isArticle = twoPages && entryKey === 'index.html'
    const limit = isArticle ? articleLimit : limits.entry
    const info = { name: manifest[entryKey].file, size }
    if (isArticle) result.article = info
    else result.entry ??= info
    if (size > limit) {
      const what = isArticle ? 'article page' : 'entry chunk'
      result.failures.push(`${what} and static imports are ${fmt(size)}, limit is ${fmt(limit)}`)
    }
  }

  // Every chunk reached through a dynamic import, measured on its own.
  const dynKeys = new Set()
  for (const item of Object.values(manifest)) (item.dynamicImports ?? []).forEach((k) => dynKeys.add(k))
  for (const key of [...dynKeys].sort()) {
    if (!manifest[key]) continue
    const size = chunkFiles(manifest[key]).reduce((s, f) => s + fileSize(f), 0)
    result.dynamic.push({ name: manifest[key].file, size })
    if (size > limits.dynamic) {
      result.failures.push(`dynamic chunk ${manifest[key].file} is ${fmt(size)}, limit is ${fmt(limits.dynamic)}`)
    }
  }

  result.total = dirSize(distDir)
  if (result.total > limits.total) {
    result.failures.push(`dist is ${fmt(result.total)}, limit is ${fmt(limits.total)}`)
  }
  return result
}

function main() {
  const r = checkBudget(join(process.cwd(), 'dist'))
  if (r.entry) console.log(`game entry + static imports: ${fmt(r.entry.size)} (${r.entry.name})`)
  if (r.article) console.log(`article page script and style: ${fmt(r.article.size)} (${r.article.name})`)
  for (const d of r.dynamic) console.log(`dynamic chunk ${d.name}: ${fmt(d.size)}`)
  console.log(`dist total: ${fmt(r.total)}`)
  for (const f of r.failures) console.log(`FAIL: ${f}`)
  if (r.failures.length) process.exit(1)
  console.log('check-budget: ok')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

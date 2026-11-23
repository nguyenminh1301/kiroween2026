import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const BANNED_WORDS = [
  'delve', 'tapestry', 'testament', 'pivotal', 'crucial', 'vibrant', 'showcase',
  'underscore', 'robust', 'seamless', 'unleash', 'embark', 'realm',
]
const BANNED_PHRASES = ['whisper of', 'echoes of']
const MAX_SUBTITLE = 90

const wordRe = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'i')
const phraseRe = new RegExp(`\\b(${BANNED_PHRASES.join('|')})\\b`, 'i')
const stringRe = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g

function* walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (['.ts', '.tsx'].includes(extname(name))) yield full
  }
}

/**
 * Scan a directory for copy rule violations.
 * @param {string} dir
 * @returns {{ file: string, line: number, reason: string }[]}
 */
export function checkCopy(dir) {
  const hits = []
  for (const file of walk(dir)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    const isSubtitles = basename(file) === 'subtitles.ts'
    lines.forEach((text, i) => {
      const line = i + 1
      const add = (reason) => hits.push({ file, line, reason })
      if (text.includes('\u2014')) add('em dash (U+2014)')
      if (text.includes('\u2013')) add('en dash (U+2013)')
      if (text.includes(' -- ')) add("double hyphen ' -- '")
      const word = wordRe.exec(text)
      if (word) add(`banned word "${word[1].toLowerCase()}"`)
      const phrase = phraseRe.exec(text)
      if (phrase) add(`banned phrase "${phrase[1].toLowerCase()}"`)
      if (isSubtitles) {
        for (const m of text.matchAll(stringRe)) {
          const s = m[1] ?? m[2] ?? m[3] ?? ''
          if (s.length > MAX_SUBTITLE) add(`subtitle is ${s.length} characters, limit is ${MAX_SUBTITLE}`)
        }
      }
    })
  }
  return hits
}

function main() {
  const dir = join(process.cwd(), 'src', 'content')
  const hits = checkCopy(dir)
  for (const h of hits) console.log(`${relative(process.cwd(), h.file)}:${h.line}: ${h.reason}`)
  if (hits.length) {
    console.log(`check-copy: ${hits.length} problem(s)`)
    process.exit(1)
  }
  console.log('check-copy: ok')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

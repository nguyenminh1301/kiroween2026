import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkCopy } from './check-copy.mjs'

const fixture = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/copy/${name}`, import.meta.url))

describe('checkCopy', () => {
  it('passes clean copy, including subtitles at the limit', () => {
    expect(checkCopy(fixture('pass'))).toEqual([])
  })

  it.each([
    ['em-dash', 'em dash', 1],
    ['en-dash', 'en dash', 1],
    ['double-hyphen', "double hyphen", 1],
    ['banned-word', 'banned word "robust"', 2],
    ['banned-phrase', 'banned phrase "echoes of"', 1],
    ['long-subtitle', '91 characters', 2],
  ])('fails %s', (name, reason, line) => {
    const hits = checkCopy(fixture(name))
    expect(hits).toHaveLength(1)
    expect(hits[0].reason).toContain(reason)
    expect(hits[0].line).toBe(line)
    expect(hits[0].file).toMatch(/\.ts$/)
  })

  it('matches whole words only', () => {
    // pass fixture holds "Realms", "underscored" and "robustly"
    const hits = checkCopy(fixture('pass'))
    expect(hits).toHaveLength(0)
  })
})

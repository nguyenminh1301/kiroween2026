import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MOMENT_IDS } from '../content/archive'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const SECTION_IDS = [
  'the-crew',
  'launch',
  'three-days-out',
  'the-landing',
  'on-the-surface',
  'alone-in-orbit',
  'coming-home',
  'what-really-happened',
  'sources',
]

describe('article page', () => {
  it('has every section in order', () => {
    let at = -1
    for (const id of SECTION_IDS) {
      const i = html.indexOf(`<section id="${id}"`)
      expect(i, id).toBeGreaterThan(at)
      at = i
    }
  })

  it('uses semantic landmarks and the meta tags', () => {
    for (const tag of ['<header', '<nav', '<main', '<article', '<figure', '<figcaption']) expect(html).toContain(tag)
    expect(html).toContain('name="description"')
    expect(html).toContain('property="og:image" content="img/article/s69-31739.jpg"')
  })

  it('shows every photo with size, lazy loading and a NASA credit', () => {
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
    expect(imgs).toHaveLength(10)
    for (const tag of imgs) {
      expect(tag).toMatch(/width="\d+"/)
      expect(tag).toMatch(/height="\d+"/)
      expect(tag).toContain('loading="lazy"')
      expect(tag).toMatch(/alt="[^"]+"/)
    }
    expect([...html.matchAll(/Credit: <a href="https:\/\/[^"]+">NASA<\/a>/g)]).toHaveLength(10)
  })

  it('lists the eight moments with a source link each', () => {
    for (const id of MOMENT_IDS) {
      const m = new RegExp(`data-moment="${id}"[\\s\\S]*?<p class="cite">Source: <a href="https://`).exec(html)
      expect(m, id).not.toBeNull()
    }
    expect(html).toContain('BURN_BABY_BURN--MASTER_IGNITION_ROUTINE')
  })

  it('has both play buttons, the closing line and no game code', () => {
    expect([...html.matchAll(/class="play[^"]*" href="\.\/play\.html"/g)]).toHaveLength(2)
    expect(html).toContain('A short first person horror game set aboard Apollo 11. The crew in the game are fictional characters.')
    expect(html).toContain('<script type="module" src="/src/article/main.ts">')
    expect(html).not.toMatch(/three\.js|@react-three|react-dom|main\.tsx/i)
  })

  it('names no fictional crew member and no creature', () => {
    expect(html).not.toMatch(/Armstead|Collier|Aldren|Gunter|creature|monster/i)
  })
})

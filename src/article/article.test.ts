import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARTICLE_END_HASH } from '../app/flow'
import { MOMENT_IDS } from '../content/archive'
import { PHOTO } from '../content/hud'
import { PRINT_PHOTOS } from '../content/prints'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const SECTION_IDS = ['crew', 'launch', 'landing', 'surface', 'orbit', 'home', 'what-really-happened', 'sources']

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
    expect(html).toContain('family=Newsreader')
    expect(html).toContain('family=Libre+Franklin')
  })

  it('links every section from the top bar and ends on the id the game returns to', () => {
    for (const id of SECTION_IDS) expect(html, id).toContain(`<a href="#${id}">`)
    expect(ARTICLE_END_HASH).toBe('what-really-happened')
    expect(html).toContain(`<section id="${ARTICLE_END_HASH}"`)
  })

  it('keeps styles in the stylesheet', () => {
    expect(html).not.toMatch(/\sstyle="/)
    expect(html).not.toMatch(/<style|<sc-|<x-dc|\{\{/)
  })

  it('shows every photo with size, lazy loading and a NASA credit', () => {
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
    expect(imgs).toHaveLength(10)
    imgs.forEach((tag, i) => {
      expect(tag).toMatch(/width="\d+"/)
      expect(tag).toMatch(/height="\d+"/)
      expect(tag).toMatch(/alt="[^"]+"/)
      // The hero photo loads at once, every other photo is lazy.
      if (i === 0) expect(tag).not.toContain('loading="lazy"')
      else expect(tag).toContain('loading="lazy"')
    })
    expect([...html.matchAll(/<a href="https:\/\/images\.nasa\.gov\/details\/[^"]+">NASA<\/a>/g)]).toHaveLength(9)
  })

  it('lists the eight moments in order with a hidden mark and a source link each', () => {
    const ids = [...html.matchAll(/data-moment="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toEqual([...MOMENT_IDS])
    for (const id of MOMENT_IDS) {
      const m = new RegExp(`data-moment="${id}"[\\s\\S]*?<span class="mark" hidden></span>[\\s\\S]*?<p class="cite">Source: <a href="https://`).exec(html)
      expect(m, id).not.toBeNull()
    }
    expect(html).toMatch(/id="marks-note" class="marks-note" hidden/)
    expect(html).toContain('BURN_BABY_BURN--MASTER_IGNITION_ROUTINE')
  })

  it('has both play buttons, the footer link, the closing line and no game code', () => {
    expect([...html.matchAll(/class="play[^"]*" href="\.\/play\.html" data-open-game/g)]).toHaveLength(2)
    expect(html).toContain('class="footer-play" href="./play.html" data-open-game')
    expect(html).toContain('is a short first person horror game set aboard Apollo 11.')
    expect(html).toContain('The crew in the game are fictional characters.')
    expect(html).toContain('<script type="module" src="/src/article/main.ts">')
    expect(html).not.toMatch(/three\.js|@react-three|react-dom|main\.tsx/i)
  })

  it('names no fictional crew member and no creature', () => {
    expect(html).not.toMatch(/Armstead|Collier|Aldren|Gunter|creature|monster/i)
  })

  it('says the game opens in a window on this page', () => {
    expect(html).toContain('The game opens in a window on this page')
  })

  it('lists every photo the game shows in the Sources', () => {
    const sources = html.slice(html.indexOf('<section id="sources"'))
    const numbers = [...Object.values(PRINT_PHOTOS).map((p) => p.number), /AS11-40-5875/.exec(PHOTO.caption)![0]]
    expect(numbers).toHaveLength(13)
    for (const n of numbers) expect(sources, n).toContain(`details/${n}">${n}</a>`)
  })
})

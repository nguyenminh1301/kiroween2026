import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ACT2_TEXT } from '../content/checklists'

const css = readFileSync(new URL('./ui.css', import.meta.url), 'utf8')
const block = (selector: string): string => {
  const i = css.indexOf(`\n${selector} {`)
  expect(i).toBeGreaterThan(-1)
  return css.slice(i, css.indexOf('}', i))
}

describe('narrow windows', () => {
  it('keeps subtitles inside 90% of the width, three lines, font scaling with the width', () => {
    const d = block('.dialogue')
    expect(d).toContain('min(900px, 90vw)')
    expect(d).toMatch(/font-size: calc\(clamp\([^)]*vw[^)]*\)/)
    expect(d).toContain('overflow-wrap')
    expect(block('.dialogue .dlg-text')).toContain('-webkit-line-clamp: 3')
  })
  it('does the same for the objective paper and the chapter card', () => {
    expect(block('.top-right')).toContain('90vw')
    expect(block('.objective')).toMatch(/font-size: clamp\([^)]*vw/)
    expect(block('.objective .obj-text')).toContain('-webkit-line-clamp: 3')
    expect(block('.fx-card p')).toContain('-webkit-line-clamp: 3')
    expect(block('.fx-card p')).toContain('90vw')
  })
  it('keeps the longest repair strip short enough for three lines on a phone', () => {
    const longest = ACT2_TEXT.prefix + [ACT2_TEXT.o2Hammer, ACT2_TEXT.press, ACT2_TEXT.comp].join(', ')
    expect(longest.length).toBeLessThanOrEqual(90)
  })
})

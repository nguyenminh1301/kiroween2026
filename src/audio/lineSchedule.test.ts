import { describe, expect, it } from 'vitest'
import type { Line } from '../content/subtitles'
import { LINE_GAP } from './lineTiming'
import { QUINDAR } from './quindar'
import { lineSeconds, scheduleLines } from './lineSchedule'

const lines: Record<string, Line> = {
  a: { speaker: 'CDR', text: 'one', seconds: 1 },
  g: { speaker: 'CAPCOM', text: 'ground', seconds: 2 },
  b: { speaker: 'CMP', text: 'two', seconds: 1 },
  m: { speaker: 'CAPCOM', text: 'part one', seconds: 1, more: ['part two'], moreSeconds: [1] },
}

describe('line schedule', () => {
  it('counts ground lines with both tones', () => {
    expect(lineSeconds(lines.g, {}, 'CAPCOM', null)).toBeCloseTo(2 + 2 * QUINDAR.seconds)
    expect(lineSeconds(lines.a, {}, 'CDR', null)).toBe(1)
  })
  it('starts a queued line after the one before it and the gap', () => {
    const s = scheduleLines(lines, [{ at: 0, id: 'g' }, { at: 0.5, id: 'b' }], 5)
    expect(s.get('g')).toBeCloseTo(0, 1)
    expect(s.get('b')).toBeCloseTo(2 + 2 * QUINDAR.seconds + LINE_GAP, 1)
  })
  it('lists the extra parts of a line', () => {
    const s = scheduleLines(lines, [{ at: 1, id: 'm' }], 6)
    expect(s.get('m')).toBeCloseTo(1, 1)
    expect(s.get('m+1')).toBeGreaterThan(s.get('m')!)
  })
  it('cuts the queue for an urgent line', () => {
    const s = scheduleLines(lines, [{ at: 0, id: 'g' }, { at: 0.1, id: 'b' }, { at: 0.2, id: 'a', opts: { urgent: true } }], 5)
    expect(s.get('a')).toBeCloseTo(0.2, 1)
    expect(s.has('b')).toBe(false)
  })
})

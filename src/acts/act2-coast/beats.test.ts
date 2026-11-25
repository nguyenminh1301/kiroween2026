import { describe, expect, it } from 'vitest'
import { LINES } from '../../content/subtitles'
import { createRadioQueue } from '../../audio/radioQueue'
import type { Subtitle } from '../../types'
import { createAct2Beats, type ObjectiveKey } from './beats'

const ORDER = ['act2.night', 'act2.out', 'act2.breaker', 'act2.pen', 'act2.fixed', 'act2.longer', 'act2.sleep']
const BEAT_OF: Record<string, number> = {
  'act2.night': 0,
  'act2.out': 0,
  'act2.breaker': 1,
  'act2.pen': 2,
  'act2.fixed': 3,
  'act2.longer': 4,
  'act2.sleep': 4,
}

function setup() {
  let sub: Subtitle | null = null
  const shown: Array<{ id: string; beatAtShow: number }> = []
  const objectives: Array<ObjectiveKey | null> = []
  const ref: { beats: ReturnType<typeof createAct2Beats> | null } = { beats: null }
  const textToId = new Map(Object.entries(LINES).map(([id, l]) => [l.text, id]))
  const queue = createRadioQueue({
    lines: LINES,
    seconds: () => 6,
    start: () => ({ stop: () => {}, fadeOut: () => {} }),
    setSubtitle: (s) => {
      sub = s
      if (s) shown.push({ id: textToId.get(s.text) ?? s.text, beatAtShow: ref.beats?.beat() ?? 0 })
    },
  })
  const beats = createAct2Beats({
    radio: { say: (id, o) => queue.say(id, o), setBeat: queue.setBeat },
    alive: () => true,
    focusOn: () => {},
    headOf: () => () => ({ x: 0, y: 0, z: 0 }),
    setObjective: (k) => objectives.push(k),
    outView: { x: 0, y: 0, z: 1 },
    breakerPos: { x: 0, y: 0, z: 2 },
    tunnelView: { x: 0, y: 0, z: 3 },
  })
  ref.beats = beats
  const advance = async (seconds: number) => {
    for (let t = 0; t < seconds - 1e-9; t += 0.05) {
      queue.tick(0.05)
      await Promise.resolve()
    }
  }
  return { beats, queue, advance, shown, objectives, sub: () => sub }
}

describe('act 2 beats', () => {
  it('never shows a line of an earlier beat after the beat changed', async () => {
    const t = setup()
    t.beats.begin()
    await t.advance(1)
    // The player is fast: every step comes a second or two after the last.
    const steps = [t.beats.crossLander, t.beats.takePen, t.beats.fixBreaker, t.beats.crossCm]
    for (const step of steps) {
      step()
      await t.advance(1.5)
      expect(BEAT_OF[t.shown[t.shown.length - 1].id]).toBe(t.beats.beat())
      expect(t.sub() === null || BEAT_OF[t.shown[t.shown.length - 1].id] === t.beats.beat()).toBe(true)
    }
    await t.advance(60)
    for (const s of t.shown) expect(BEAT_OF[s.id]).toBe(s.beatAtShow)
    expect(t.queue.ids()).toEqual([])
  })

  it('clears the subtitle at once when its beat ends, and queues no line twice', async () => {
    const t = setup()
    t.beats.begin()
    await t.advance(0.2)
    expect(t.sub()?.text).toBe(LINES['act2.night'].text)
    t.beats.crossLander()
    expect(t.sub()?.text).toBe(LINES['act2.breaker'].text)
    await t.advance(120)
    const ids = t.shown.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('act2.out')
  })

  it('sets each objective when the beat starts, not when its line ends', () => {
    const t = setup()
    t.beats.begin()
    t.beats.crossLander()
    t.beats.takePen()
    t.beats.fixBreaker()
    t.beats.crossCm()
    expect(t.objectives).toEqual(['act2Out', 'act2Fix', 'act2Push', 'act2Back', 'act2Sleep'])
  })

  it('plays the lines of a quiet player in order', async () => {
    const t = setup()
    t.beats.begin()
    await t.advance(30)
    expect(t.shown.map((s) => s.id)).toEqual(['act2.night', 'act2.out'])
    expect(ORDER).toContain('act2.out')
  })
})

import { describe, expect, it } from 'vitest'
import { LINES } from '../../content/subtitles'
import { createRadioQueue } from '../../audio/radioQueue'
import type { Subtitle } from '../../types'
import { createAct2Beats, type ObjectiveKey } from './beats'

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
    setObjective: (k) => objectives.push(k),
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
  it('plays the opening lines in order for a quiet player', async () => {
    const t = setup()
    t.beats.begin()
    await t.advance(40)
    expect(t.shown.map((s) => s.id)).toEqual(['act2.jobs', 'act2.press', 'act2.out'])
    expect(t.objectives).toEqual(['repairs'])
  })

  it('never shows a line of an earlier beat after the beat changed', async () => {
    const t = setup()
    t.beats.begin()
    await t.advance(1)
    t.beats.nearJoint()
    await t.advance(1.5)
    expect(t.shown[t.shown.length - 1].id).toBe('act2.o2')
    t.beats.enterLander()
    await t.advance(60)
    for (const s of t.shown) {
      if (s.id === 'act2.o2') expect(s.beatAtShow).toBe(1)
      if (s.id === 'act2.site') expect(s.beatAtShow).toBe(2)
    }
    expect(t.shown.map((s) => s.id)).not.toContain('act2.press')
  })

  it('says the Houston line when a repair is done and goes on to the right objective', async () => {
    const t = setup()
    t.beats.repairDone('o2', 'repairs')
    await t.advance(0.2)
    expect(t.sub()?.text).toBe(LINES['act2.o2done'].text)
    t.beats.repairDone('press', 'repairs')
    expect(t.sub()?.text).toBe(LINES['act2.pressdone'].text)
    t.beats.repairDone('site', 'back')
    expect(t.sub()?.text).toBe(LINES['act2.sitedone'].text)
    expect(t.objectives).toEqual(['repairs', 'repairs', 'act2Back'])
  })

  it('says the tunnel line on the way back, then lights out when everything is done', async () => {
    const t = setup()
    t.beats.crossBack('sleep')
    await t.advance(30)
    expect(t.shown.map((s) => s.id)).toEqual(['act2.longer', 'act2.sleep'])
    expect(t.objectives).toEqual(['act2Sleep'])
    t.beats.enterBag()
    expect(t.objectives.at(-1)).toBe('act2Eyes')
  })

  it('has every line it needs, and none of the old pen and breaker lines', () => {
    for (const id of ['act2.jobs', 'act2.o2', 'act2.o2done', 'act2.press', 'act2.pressdone', 'act2.site', 'act2.sitedone'])
      expect(LINES[id]).toBeTruthy()
    for (const id of ['act2.pen', 'act2.breaker', 'act2.fixed', 'act2.flashes']) expect(LINES[id]).toBeUndefined()
  })
})

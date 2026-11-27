import { describe, expect, it } from 'vitest'
import type { Line } from '../content/subtitles'
import type { Subtitle } from '../types'
import { createRadioQueue } from './radioQueue'

const lines: Record<string, Line> = {
  a: { speaker: 'CDR', text: 'one', seconds: 1 },
  b: { speaker: 'CMP', text: 'two', seconds: 1 },
  c: { speaker: 'CAPCOM', text: 'three', seconds: 2 },
  m: { speaker: 'CAPCOM', text: 'part one', more: ['part two', 'part three'] },
}

function setup() {
  const log: string[] = []
  let subtitle: Subtitle | null = null
  const radio = createRadioQueue({
    lines,
    seconds: (_id, l) => l.seconds ?? 1,
    start: (id) => {
      log.push(`start ${id}`)
      return { stop: () => log.push(`stop ${id}`) }
    },
    setSubtitle: (s) => {
      subtitle = s
    },
  })
  // Fake clock: advance in 0.05 s steps.
  const advance = (seconds: number) => {
    for (let t = 0; t < seconds - 1e-9; t += 0.05) radio.tick(0.05)
  }
  return { radio, log, advance, sub: () => subtitle }
}

describe('radio queue', () => {
  it('plays the parts of a long line in order and resolves after the last', async () => {
    const { radio, log, advance, sub } = setup()
    let done = false
    void radio.say('m').then(() => (done = true))
    void radio.say('a')
    expect(sub()?.text).toBe('part one')
    expect(radio.ids()).toEqual(['m', 'm+1', 'm+2', 'a'])
    advance(1.4)
    expect(sub()?.text).toBe('part two')
    advance(1.4)
    expect(sub()?.text).toBe('part three')
    expect(done).toBe(false)
    advance(1.4)
    await Promise.resolve()
    expect(done).toBe(true)
    expect(log.filter((l) => l.startsWith('start'))).toEqual(['start m', 'start m+1', 'start m+2', 'start a'])
  })

  it('plays lines in order, one at a time', () => {
    const { radio, log, advance, sub } = setup()
    void radio.say('a')
    void radio.say('b')
    expect(log).toEqual(['start a'])
    expect(radio.ids()).toEqual(['a', 'b'])
    expect(sub()?.text).toBe('one')
    advance(1.1)
    expect(log).toContain('stop a')
    expect(log).not.toContain('start b')
    advance(0.5)
    expect(log.indexOf('start b')).toBeGreaterThan(log.indexOf('stop a'))
    expect(sub()?.text).toBe('two')
  })

  it('waits 0.35 s between lines', () => {
    const { radio, log, advance, sub } = setup()
    void radio.say('a')
    void radio.say('b')
    advance(1)
    expect(sub()).toBeNull()
    advance(0.25)
    expect(log).not.toContain('start b')
    advance(0.15)
    expect(log).toContain('start b')
  })

  it('urgent ends the current line, clears the queue and plays now', async () => {
    const { radio, log, sub } = setup()
    void radio.say('a')
    const queued = radio.say('b')
    void radio.say('urgent-missing')
    void radio.say('c', { urgent: true })
    expect(log).toEqual(['start a', 'stop a', 'start c'])
    expect(radio.ids()).toEqual(['c'])
    expect(sub()?.text).toBe('three')
    await queued
  })

  it('resolves the promise when the line ends, and at once for an unknown id', async () => {
    const { radio, advance } = setup()
    let done = false
    void radio.say('a').then(() => {
      done = true
    })
    advance(0.9)
    await Promise.resolve()
    expect(done).toBe(false)
    advance(0.2)
    await Promise.resolve()
    expect(done).toBe(true)
    await expect(radio.say('nope')).resolves.toBeUndefined()
    expect(radio.ids()).toEqual([])
  })

  it('holds the line while game time does not advance', () => {
    const { radio, sub } = setup()
    void radio.say('a')
    // A paused game never calls tick. Nothing changes however long it lasts.
    expect(sub()?.text).toBe('one')
    expect(radio.ids()).toEqual(['a'])
  })

  it('calls onStart and uses the speaker override', () => {
    const { radio, sub } = setup()
    let started = 0
    void radio.say('c', { speaker: 'UNKNOWN', onStart: () => started++ })
    expect(started).toBe(1)
    expect(sub()?.speaker).toBe('UNKNOWN')
  })

  it('drops queued lines of earlier beats and cuts the playing one', () => {
    const log: string[] = []
    let sub: Subtitle | null = null
    const radio = createRadioQueue({
      lines,
      seconds: (_id, l) => l.seconds ?? 1,
      start: (id) => {
        log.push(`start ${id}`)
        return { stop: () => log.push(`stop ${id}`), fadeOut: (s) => log.push(`fade ${id} ${s}`) }
      },
      setSubtitle: (s) => {
        sub = s
      },
    })
    const done: string[] = []
    void radio.say('a').then(() => done.push('a'))
    void radio.say('b').then(() => done.push('b'))
    radio.setBeat(1)
    expect(log).toEqual(['start a', 'fade a 0.5'])
    expect(sub).toBeNull()
    expect(radio.ids()).toEqual([])
    return Promise.resolve().then(() => {
      expect(done.sort()).toEqual(['a', 'b'])
      void radio.say('c')
      expect(radio.ids()).toEqual(['c'])
      expect(sub?.text).toBe('three')
    })
  })

  it('keeps lines queued in the new beat', () => {
    const { radio, advance, sub } = setup()
    void radio.say('a')
    radio.setBeat(1)
    void radio.say('b')
    void radio.say('c', { beat: 1 })
    radio.setBeat(1)
    advance(0.5)
    expect(radio.ids()).toContain('c')
    expect(sub()?.text).toBe('two')
  })

  it('never queues a line twice', () => {
    const { radio } = setup()
    void radio.say('a')
    void radio.say('b')
    void radio.say('b')
    void radio.say('a')
    expect(radio.ids()).toEqual(['a', 'b'])
  })
})

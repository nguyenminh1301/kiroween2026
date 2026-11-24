import { describe, expect, it } from 'vitest'
import type { Line } from '../content/subtitles'
import type { Subtitle } from '../types'
import { createRadioQueue } from './radioQueue'

const lines: Record<string, Line> = {
  a: { speaker: 'CDR', text: 'one', seconds: 1 },
  b: { speaker: 'CMP', text: 'two', seconds: 1 },
  c: { speaker: 'CAPCOM', text: 'three', seconds: 2 },
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
})

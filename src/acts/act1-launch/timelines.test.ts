import { describe, expect, it } from 'vitest'
import { groundSeconds, readingSeconds } from '../../audio/lineTiming'
import { QUINDAR } from '../../audio/quindar'
import { createRadioQueue } from '../../audio/radioQueue'
import { LINES } from '../../content/subtitles'
import { sortedEvents } from '../../timeline/timeline'
import {
  alarmOn,
  cabinSeconds,
  engineLevel,
  LAUNCH_SHOTS,
  LAUNCH_DURATION,
  launchEvents,
  ORBIT_AT,
  rocketHeight,
  shotAt,
  STAGING_AT,
  TLI_SHOTS,
  TOWER_AT,
  tliEvents,
} from './timelines'

function record() {
  const log: [number, string][] = []
  let at = 0
  const push = (s: string) => log.push([at, s])
  const hooks = {
    say: (id: string, o?: { onStart?: () => void }) => {
      push(id)
      o?.onStart?.()
    },
    playSound: (n: string) => push(n),
    ignite: () => push('ignite'),
    liftoff: () => push('liftoff'),
    setSky: (c: string) => push(`sky ${c}`),
    moment: (id: string) => push(`moment ${id}`),
    print: (id: string) => push(`print ${id}`),
    showEarth: () => push('earth'),
    earthLines: () => push('earthLines'),
  }
  return { log, hooks, setAt: (t: number) => (at = t) }
}

describe('launch timeline', () => {
  it('lists the events at the right times', () => {
    const r = record()
    for (const e of sortedEvents({ duration: LAUNCH_DURATION, events: launchEvents(r.hooks) })) {
      r.setAt(e.at)
      e.run()
    }
    expect(r.log).toEqual([
      [0.1, 'act1.count'],
      [3.2, 'rumble'],
      [3.5, 'ignite'],
      [4.3, 'act1.count2'],
      [4.5, 'liftoff'],
      [4.5, 'act1.liftoff'],
      [5.2, 'launchRoar'],
      [8.6, 'print liftoff'],
      [10.75, 'sky #4a6a8a'],
      [10.75, 'act1.tower'],
      [12.6, 'act1.roll'],
      [14.65, 'sky #1a2636'],
      [14.65, 'act1.rollok'],
      [16.4, 'act1.maxq'],
      [19.65, 'act1.staginggo'],
      [23, 'alarm'],
      [23.2, 'staging'],
      [23.2, 'act1.staging'],
      [25.05, 'act1.jettison'],
      [25.05, 'moment escape-tower'],
      [26.4, 'sky #000000'],
      [28, 'act1.shutdown'],
      [29.35, 'act1.orbit'],
    ])
  })

  it('says the twelve launch lines in the order of the record', () => {
    const r = record()
    sortedEvents({ duration: LAUNCH_DURATION, events: launchEvents(r.hooks) }).forEach((e) => e.run())
    expect(r.log.map(([, s]) => s).filter((s) => s.startsWith('act1.'))).toEqual([
      'act1.count',
      'act1.count2',
      'act1.liftoff',
      'act1.tower',
      'act1.roll',
      'act1.rollok',
      'act1.maxq',
      'act1.staginggo',
      'act1.staging',
      'act1.jettison',
      'act1.shutdown',
      'act1.orbit',
    ])
  })

  it('fits the lines to the beats: each starts within 3 s of its event, in order, none urgent', () => {
    const starts: [string, number][] = []
    const q = createRadioQueue({
      lines: LINES,
      seconds: (_id, l, _o, speaker) => {
        const reading = readingSeconds(l)
        return speaker === 'CAPCOM' || speaker === 'LAUNCH' ? groundSeconds(reading, QUINDAR.seconds) : reading
      },
      start: (id) => {
        starts.push([id, now])
        return null
      },
      setSubtitle: () => {},
    })
    let now = 0
    const events = sortedEvents({
      duration: LAUNCH_DURATION,
      events: launchEvents({
        say: (id, o) => {
          expect(o?.urgent).toBeUndefined()
          eventAt.set(id, now)
          void q.say(id)
        },
        playSound: () => {},
        ignite: () => {},
        liftoff: () => {},
        setSky: () => {},
        moment: () => {},
        print: () => {},
      }),
    })
    const eventAt = new Map<string, number>()
    let i = 0
    for (; now < LAUNCH_DURATION + 8; now = Math.round((now + 0.05) * 100) / 100) {
      while (i < events.length && events[i].at <= now + 1e-9) events[i++].run()
      q.tick(0.05)
    }
    expect(starts.map(([id]) => id).filter((id) => !id.includes('+'))).toHaveLength(12)
    for (const [id, t] of starts) expect(t - (eventAt.get(id) ?? t)).toBeLessThan(3)
    const times = starts.map(([, t]) => t)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('keeps the cabin on screen for about 10 s from ignition to orbit shutdown', () => {
    expect(cabinSeconds()).toBeGreaterThanOrEqual(9.5)
    expect(cabinSeconds()).toBeLessThanOrEqual(10.5)
  })

  it('has the outside shots: two pad views and four space views', () => {
    expect(LAUNCH_SHOTS.map((s) => [s.name, +(s.to - s.from).toFixed(1), s.fov])).toEqual([
      ['padFar', 3.3, 50],
      ['padLow', 3.4, 75],
      ['climb', 4, 58],
      ['stack', 3.4, 52],
      ['staging', 2.2, 60],
      ['jettison', 3, 55],
    ])
  })

  it('has the shot windows', () => {
    const at = (t: number) => shotAt(LAUNCH_SHOTS, t)?.name ?? null
    expect([2, 4, 6, 10, 12, 17, 20, 24, 26, 29].map(at)).toEqual([
      'padFar',
      null,
      'padLow',
      null,
      'climb',
      null,
      'stack',
      'staging',
      'jettison',
      null,
    ])
  })

  it('shakes, climbs and sounds the alarm on schedule', () => {
    expect(engineLevel(3.4)).toBe(0)
    expect(engineLevel(TOWER_AT)).toBe(1)
    expect(engineLevel(20)).toBe(1)
    expect(engineLevel(STAGING_AT + 1)).toBeCloseTo(0.3)
    expect(engineLevel(ORBIT_AT - 0.1)).toBeLessThan(0.3)
    expect([22.9, 23, 24.7, 24.9].map(alarmOn)).toEqual([false, true, true, false])
    expect(rocketHeight(4.5)).toBe(0)
    expect(rocketHeight(6.5)).toBeCloseTo(7.2)
    expect(rocketHeight(100)).toBe(rocketHeight(12))
  })
})

describe('TLI timeline', () => {
  it('lists the events and the single shot', () => {
    const r = record()
    for (const e of sortedEvents({ duration: 15, events: tliEvents(r.hooks) })) {
      r.setAt(e.at)
      e.run()
    }
    expect(r.log).toEqual([
      [0.2, 'rumble'],
      [0.3, 'act1.tliburn'],
      [0.4, 'act1.tligo'],
      [3, 'act1.flashes'],
      [6.5, 'earth'],
      [6.7, 'print earth'],
      [7.2, 'earthLines'],
    ])
    expect(TLI_SHOTS).toHaveLength(1)
    expect([0.3, 0.4, 5.5, 5.6].map((t) => shotAt(TLI_SHOTS, t)?.name ?? null)).toEqual([null, 'tli', 'tli', null])
  })
})

import { describe, expect, it } from 'vitest'
import { sortedEvents } from '../../timeline/timeline'
import {
  alarmOn,
  engineLevel,
  LAUNCH_SHOTS,
  launchEvents,
  rocketHeight,
  shotAt,
  TLI_SHOTS,
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
    showEarth: () => push('earth'),
    earthLines: () => push('earthLines'),
  }
  return { log, hooks, setAt: (t: number) => (at = t) }
}

describe('launch timeline', () => {
  it('lists the events at the right times', () => {
    const r = record()
    for (const e of sortedEvents({ duration: 150, events: launchEvents(r.hooks) })) {
      r.setAt(e.at)
      e.run()
    }
    expect(r.log).toEqual([
      [0.5, 'act1.count'],
      [3.2, 'rumble'],
      [3.5, 'ignite'],
      [4.5, 'liftoff'],
      [4.5, 'act1.liftoff'],
      [5.2, 'launchRoar'],
      [8, 'act1.clock'],
      [9.5, 'act1.tower'],
      [20, 'act1.roll'],
      [22.5, 'act1.rollok'],
      [40, 'sky #4a6a8a'],
      [70, 'act1.maxq'],
      [95, 'sky #1a2636'],
      [109.8, 'alarm'],
      [110, 'staging'],
      [110, 'act1.staging'],
      [122, 'act1.jettison'],
      [122, 'moment escape-tower'],
      [126, 'sky #000000'],
      [135, 'act1.sky'],
      [145, 'act1.orbit'],
    ])
  })

  it('has the shot windows', () => {
    const at = (t: number) => shotAt(LAUNCH_SHOTS, t)?.name ?? null
    expect([2, 4, 6, 50, 111, 123, 140].map(at)).toEqual(['padFar', null, 'padLow', null, 'staging', 'jettison', null])
    expect(LAUNCH_SHOTS.map((s) => s.fov)).toEqual([50, 75, 60, 55])
  })

  it('shakes, climbs and sounds the alarm on schedule', () => {
    expect(engineLevel(3.4)).toBe(0)
    expect(engineLevel(9.5)).toBe(1)
    expect(engineLevel(60)).toBe(1)
    expect(engineLevel(111)).toBeCloseTo(0.3)
    expect(engineLevel(149)).toBeLessThan(0.3)
    expect([109.7, 109.8, 111.5, 111.6].map(alarmOn)).toEqual([false, true, true, false])
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
      [6.5, 'earth'],
      [7.2, 'earthLines'],
    ])
    expect(TLI_SHOTS).toHaveLength(1)
    expect([0.3, 0.4, 5.5, 5.6].map((t) => shotAt(TLI_SHOTS, t)?.name ?? null)).toEqual([null, 'tli', 'tli', null])
  })
})

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
    showEarth: () => push('earth'),
    earthLines: () => push('earthLines'),
  }
  return { log, hooks, setAt: (t: number) => (at = t) }
}

describe('launch timeline', () => {
  it('lists the events at the right times', () => {
    const r = record()
    for (const e of sortedEvents({ duration: 16, events: launchEvents(r.hooks) })) {
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
      [7, 'sky #4a6a8a'],
      [9, 'sky #1a2636'],
      [9.8, 'alarm'],
      [10, 'staging'],
      [10, 'act1.staging'],
      [13, 'sky #000000'],
    ])
  })

  it('has the shot windows', () => {
    const at = (t: number) => shotAt(LAUNCH_SHOTS, t)?.name ?? null
    expect([2, 4, 6, 11, 14].map(at)).toEqual(['padFar', null, 'padLow', 'staging', null])
    expect(LAUNCH_SHOTS.map((s) => s.fov)).toEqual([50, 75, 60])
  })

  it('shakes, climbs and sounds the alarm on schedule', () => {
    expect(engineLevel(3.4)).toBe(0)
    expect(engineLevel(9.5)).toBe(1)
    expect(engineLevel(10.5)).toBeCloseTo(0.3)
    expect(engineLevel(15)).toBeLessThan(0.3)
    expect([9.7, 9.8, 11.5, 11.6].map(alarmOn)).toEqual([false, true, true, false])
    expect(rocketHeight(4.5)).toBe(0)
    expect(rocketHeight(6.5)).toBeCloseTo(7.2)
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

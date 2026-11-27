import { describe, expect, it } from 'vitest'
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
      [0.2, 'act1.count2'],
      [3.2, 'rumble'],
      [3.5, 'ignite'],
      [4.5, 'liftoff'],
      [4.5, 'act1.liftoff'],
      [5.2, 'launchRoar'],
      [9, 'sky #4a6a8a'],
      [10.8, 'sky #1a2636'],
      [11.4, 'alarm'],
      [11.6, 'staging'],
      [11.6, 'act1.staging'],
      [14.2, 'act1.jettison'],
      [14.2, 'moment escape-tower'],
      [17.6, 'sky #000000'],
      [22.9, 'act1.orbit'],
    ])
  })

  it('says only the five kept lines', () => {
    const r = record()
    launchEvents(r.hooks).forEach((e) => e.run())
    const said = r.log.map(([, s]) => s).filter((s) => s.startsWith('act1.'))
    expect(said.sort()).toEqual(['act1.count2', 'act1.jettison', 'act1.liftoff', 'act1.orbit', 'act1.staging'])
  })

  it('keeps the cabin on screen for about 10 s from ignition to orbit shutdown', () => {
    expect(cabinSeconds()).toBeGreaterThanOrEqual(9.5)
    expect(cabinSeconds()).toBeLessThanOrEqual(10.5)
  })

  it('keeps the four outside shots as they were', () => {
    expect(LAUNCH_SHOTS.map((s) => [s.name, +(s.to - s.from).toFixed(1), s.fov])).toEqual([
      ['padFar', 3.3, 50],
      ['padLow', 3.4, 75],
      ['staging', 2.6, 60],
      ['jettison', 3.4, 55],
    ])
  })

  it('has the shot windows', () => {
    const at = (t: number) => shotAt(LAUNCH_SHOTS, t)?.name ?? null
    expect([2, 4, 6, 10, 12, 15, 20].map(at)).toEqual(['padFar', null, 'padLow', null, 'staging', 'jettison', null])
  })

  it('shakes, climbs and sounds the alarm on schedule', () => {
    expect(engineLevel(3.4)).toBe(0)
    expect(engineLevel(TOWER_AT)).toBe(1)
    expect(engineLevel(11)).toBe(1)
    expect(engineLevel(STAGING_AT + 1)).toBeCloseTo(0.3)
    expect(engineLevel(ORBIT_AT - 0.1)).toBeLessThan(0.3)
    expect([11.3, 11.4, 13.1, 13.3].map(alarmOn)).toEqual([false, true, true, false])
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

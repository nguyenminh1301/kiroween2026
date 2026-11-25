import { describe, expect, it } from 'vitest'
import { dueEvents, selectShot, shakeAmplitude } from '../../timeline/timeline'
import { ROOF } from './layout'
import {
  LIFTOFF_DURATION,
  LIFTOFF_SHAKE,
  LIFTOFF_SHOTS,
  ascentRise,
  captionOn,
  creatureAt,
  fireLevel,
  flagTip,
  liftoffEvents,
} from './liftoff'

describe('liftoff', () => {
  it('rises (t - 1.4)^1.8 * 0.9 after the fire starts', () => {
    expect(ascentRise(1.4)).toBe(0)
    expect(ascentRise(5)).toBeCloseTo(3.6 ** 1.8 * 0.9, 6)
  })

  it('fades the fire over 7 s and tips the flag after 0.4 s', () => {
    expect(fireLevel(1)).toBe(0)
    expect(fireLevel(1.4)).toBe(1)
    expect(fireLevel(8.4)).toBe(0)
    expect(flagTip(1.7)).toBe(0)
    expect(flagTip(2.6)).toBe(1)
    expect(captionOn(5.3)).toBe(true)
    expect(captionOn(5.4)).toBe(false)
  })

  it('leaps from where it was to the roof in an arc, then sinks away', () => {
    const from = { x: -10, y: 0, z: -4 }
    expect(creatureAt(0.2, from).pos).toEqual(from)
    const mid = creatureAt(0.75, from)
    expect(mid.pos.y).toBeGreaterThan(ROOF.y / 2 + 1.4)
    const end = creatureAt(1.3, from).pos
    expect([end.x, end.y, end.z].map((n) => +n.toFixed(6))).toEqual([ROOF.x, ROOF.y, ROOF.z])
    expect(creatureAt(3, from).sink).toBeGreaterThan(0.5)
    expect(creatureAt(5, from).visible).toBe(false)
  })

  it('has the shots and the shake from the plan', () => {
    expect(selectShot(LIFTOFF_SHOTS, 3)?.fov).toBe(80)
    for (let t = 0; t < LIFTOFF_DURATION; t += 0.5) expect(selectShot(LIFTOFF_SHOTS, t)).not.toBeNull()
    expect(shakeAmplitude(LIFTOFF_SHAKE, 1.6, false)).toBe(0.12)
    expect(shakeAmplitude(LIFTOFF_SHAKE, 5, false)).toBe(0.05)
    expect(shakeAmplitude(LIFTOFF_SHAKE, 9, false)).toBe(0)
  })

  it('runs the events at their times', () => {
    const log: string[] = []
    const def = {
      duration: LIFTOFF_DURATION,
      events: liftoffEvents(
        {
          say: (id, o) => log.push(`say:${id}${o?.urgent ? ':urgent' : ''}`),
          sting: () => log.push('sting'),
          caption: (t) => log.push(`caption:${t}`),
          anomaly: (a) => log.push(`anomaly:${a}`),
          end: () => log.push('end'),
        },
        'BURN',
      ),
    }
    dueEvents(def, 0, 0, 1.4).forEach((e) => e.run())
    expect(log).toEqual(['say:act4.liftoff:urgent', 'sting', 'caption:BURN', 'anomaly:burn-baby-burn'])
    log.length = 0
    dueEvents(def, 2, 1.4, 14).forEach((e) => e.run())
    expect(log).toEqual(['caption:null', 'say:act4.burned', 'say:act4.columbia', 'end'])
  })
})

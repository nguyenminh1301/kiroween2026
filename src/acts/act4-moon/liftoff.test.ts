import { describe, expect, it } from 'vitest'
import { dueEvents, selectShot, shakeAmplitude } from '../../timeline/timeline'
import {
  LIFTOFF_DURATION,
  LIFTOFF_SHAKE,
  LIFTOFF_SHOTS,
  ascentRise,
  captionOn,
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
          caption: (t) => log.push(`caption:${t}`),
          anomaly: (a) => log.push(`anomaly:${a}`),
          end: () => log.push('end'),
        },
        'BURN',
      ),
    }
    dueEvents(def, 0, 0, 1.4).forEach((e) => e.run())
    expect(log).toEqual(['say:act4.liftoff:urgent', 'caption:BURN', 'anomaly:burn-baby-burn'])
    log.length = 0
    dueEvents(def, 2, 1.4, 14).forEach((e) => e.run())
    expect(log).toEqual(['say:act4.flagdown', 'caption:null', 'say:act4.columbia', 'end'])
  })
})

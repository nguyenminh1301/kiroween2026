import { describe, expect, it } from 'vitest'
import { dueEvents, selectShot, shakeAmplitude } from '../../timeline/timeline'
import {
  LIFTOFF_DURATION,
  LIFTOFF_SHAKE,
  LIFTOFF_SHOTS,
  ascentRise,
  BLAST_DUST,
  BLAST_SCRAPS,
  blastDustAt,
  readoutAt,
  scrapAt,
  fireLevel,
  flagTip,
  liftoffEvents,
} from './liftoff'
import { cabinShotAt } from './descent'

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
  })

  it('types the readout line by line, then removes it after 4 s', () => {
    const lines = ['ONE', 'TWO LINES']
    expect(readoutAt(1.3, 'HEAD', lines)).toBeNull()
    expect(readoutAt(1.4, 'HEAD', lines)?.lines).toEqual([])
    expect(readoutAt(1.4 + 0.25 + 1 / 38 + 0.001, 'HEAD', lines)?.lines).toEqual(['O'])
    expect(readoutAt(1.4 + 1.2, 'HEAD', lines)?.lines).toEqual(['ONE', 'TWO LINES'])
    expect(readoutAt(1.4 + 4, 'HEAD', lines)).toBeNull()
    expect(readoutAt(2.2, 'HEAD', lines)?.header).toBe('HEAD')
  })

  it('throws foil and dust off the deck: up and out, then down onto the dust', () => {
    for (let i = 0; i < BLAST_SCRAPS; i++) {
      const start = scrapAt(i, 0)
      expect(start.y).toBeCloseTo(3.04, 5)
      const late = scrapAt(i, 30)
      expect(late.y).toBeCloseTo(0.03, 5)
      expect(Math.hypot(late.x, late.z)).toBeGreaterThan(Math.hypot(start.x, start.z))
      expect(scrapAt(i, 40)).toEqual(late)
    }
    for (let i = 0; i < BLAST_DUST; i++) {
      const d = blastDustAt(i, 2)
      expect(d.y).toBeGreaterThanOrEqual(0.05)
      expect(Math.hypot(d.x, d.z)).toBeGreaterThan(Math.hypot(blastDustAt(i, 0).x, blastDustAt(i, 0).z))
    }
  })

  it('has the shots and the shake from the plan', () => {
    expect(selectShot(LIFTOFF_SHOTS, 3)?.fov).toBe(80)
    expect(cabinShotAt(LIFTOFF_SHOTS, 0.5)).toBe(true)
    expect(cabinShotAt(LIFTOFF_SHOTS, 6)).toBe(true)
    expect(cabinShotAt(LIFTOFF_SHOTS, 3)).toBe(false)
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
          readout: (on) => log.push(`readout:${on}`),
          anomaly: (a) => log.push(`anomaly:${a}`),
          end: () => log.push('end'),
        },
      ),
    }
    dueEvents(def, 0, 0, 1.4).forEach((e) => e.run())
    expect(log).toEqual(['say:act4.liftoff:urgent', 'readout:true', 'anomaly:burn-routine'])
    log.length = 0
    dueEvents(def, 2, 1.4, 14).forEach((e) => e.run())
    expect(log).toEqual(['say:act4.flagdown', 'anomaly:flag-knocked', 'readout:false', 'say:act4.columbia', 'end'])
  })
})

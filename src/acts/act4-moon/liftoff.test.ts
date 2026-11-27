import { describe, expect, it } from 'vitest'
import { dueEvents, selectShot, shakeAmplitude } from '../../timeline/timeline'
import {
  FIRE_AT,
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
  fireShape,
  FIRE_LENGTH,
  ASCENT_LENGTH,
  FIRE_RADIUS_TAIL,
  fadeAt,
  FADE_FROM,
  PRELOAD_AT,
  flagTip,
  liftoffEvents,
} from './liftoff'
import { cabinShotAt } from './descent'

describe('liftoff', () => {
  it('rises (t - FIRE_AT)^1.8 * 0.9 after the fire starts', () => {
    expect(ascentRise(FIRE_AT)).toBe(0)
    expect(ascentRise(FIRE_AT + 3.6)).toBeCloseTo(3.6 ** 1.8 * 0.9, 6)
  })

  it('fades the fire over 7 s and tips the flag after 0.4 s', () => {
    expect(fireLevel(FIRE_AT - 0.4)).toBe(0)
    expect(fireLevel(FIRE_AT)).toBe(1)
    expect(fireLevel(FIRE_AT + 7)).toBe(0)
    expect(flagTip(FIRE_AT + 0.3)).toBe(0)
    expect(flagTip(FIRE_AT + 1.2)).toBe(1)
  })

  it('types the readout line by line, then removes it after 4 s', () => {
    const lines = ['ONE', 'TWO LINES']
    expect(readoutAt(FIRE_AT - 0.1, 'HEAD', lines)).toBeNull()
    expect(readoutAt(FIRE_AT, 'HEAD', lines)?.lines).toEqual([])
    expect(readoutAt(FIRE_AT + 0.25 + 1 / 38 + 0.001, 'HEAD', lines)?.lines).toEqual(['O'])
    expect(readoutAt(FIRE_AT + 1.2, 'HEAD', lines)?.lines).toEqual(['ONE', 'TWO LINES'])
    expect(readoutAt(FIRE_AT + 4, 'HEAD', lines)).toBeNull()
    expect(readoutAt(FIRE_AT + 0.8, 'HEAD', lines)?.header).toBe('HEAD')
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
    expect(selectShot(LIFTOFF_SHOTS, 5)?.fov).toBe(80)
    expect(cabinShotAt(LIFTOFF_SHOTS, 0.5)).toBe(true)
    expect(cabinShotAt(LIFTOFF_SHOTS, 8)).toBe(true)
    expect(cabinShotAt(LIFTOFF_SHOTS, 5)).toBe(false)
    for (let t = 0; t < LIFTOFF_DURATION; t += 0.5) expect(selectShot(LIFTOFF_SHOTS, t)).not.toBeNull()
    expect(shakeAmplitude(LIFTOFF_SHAKE, FIRE_AT + 0.2, false)).toBe(0.12)
    expect(shakeAmplitude(LIFTOFF_SHAKE, 6.6, false)).toBe(0.05)
    expect(shakeAmplitude(LIFTOFF_SHAKE, 10.6, false)).toBe(0)
  })

  it('loads the next act well before the shot ends, then fades to black with no gap', () => {
    expect(PRELOAD_AT).toBeLessThan(FADE_FROM)
    expect(LIFTOFF_DURATION - PRELOAD_AT).toBeGreaterThan(3)
    expect(fadeAt(FADE_FROM - 0.1)).toBe(0)
    expect(fadeAt(LIFTOFF_DURATION)).toBe(1)
    let prev = 0
    for (let t = FADE_FROM; t <= LIFTOFF_DURATION; t += 0.1) {
      expect(fadeAt(t)).toBeGreaterThanOrEqual(prev)
      prev = fadeAt(t)
    }
  })

  it('draws a long narrow flame, three stage lengths at full fire', () => {
    expect(fireShape(1).length).toBeCloseTo(3 * ASCENT_LENGTH, 6)
    expect(FIRE_LENGTH).toBe(3 * ASCENT_LENGTH)
    expect(FIRE_RADIUS_TAIL * 2).toBeLessThan(FIRE_LENGTH / 4)
    expect(fireShape(0.2).length).toBeLessThan(fireShape(1).length)
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
          preload: () => log.push('preload'),
          end: () => log.push('end'),
        },
      ),
    }
    dueEvents(def, 0, 0, FIRE_AT).forEach((e) => e.run())
    expect(log).toEqual(['say:act4.liftoff:urgent', 'readout:true', 'anomaly:burn-routine'])
    log.length = 0
    dueEvents(def, 2, FIRE_AT, LIFTOFF_DURATION).forEach((e) => e.run())
    expect(log).toEqual([
      'say:act4.off',
      'say:act4.quiet',
      'say:act4.flagdown',
      'anomaly:flag-knocked',
      'readout:false',
      'preload',
      'say:act4.columbia',
      'end',
    ])
  })
})

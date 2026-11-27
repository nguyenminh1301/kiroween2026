import { describe, expect, it } from 'vitest'
import { DESCENT_DURATION, DESCENT_SHOTS, cabinShotAt, descentEvents, descentFill, dustAt, dustShape, dustLevel, landerHeight, plumeOn } from './descent'
import { selectShot, sortedEvents, dueEvents } from '../../timeline/timeline'

describe('descent', () => {
  it('follows 40 * (1 - t/22)^1.6', () => {
    expect(landerHeight(0)).toBe(40)
    expect(landerHeight(11)).toBeCloseTo(40 * 0.5 ** 1.6, 6)
    expect(landerHeight(22)).toBe(0)
    expect(landerHeight(24)).toBe(0)
  })

  it('shows the plume above 0.02 m and dust below 10 m', () => {
    expect(plumeOn(0.03)).toBe(true)
    expect(plumeOn(0.01)).toBe(false)
    expect(dustLevel(12)).toBe(0)
    expect(dustLevel(5)).toBeCloseTo(0.5)
    expect(dustLevel(0)).toBe(1)
  })

  it('blows a wide thin dust sheet that is clear in the 19 to 24 s shot and gone after touchdown', () => {
    expect(dustAt(8)).toBe(0)
    expect(dustAt(15)).toBeGreaterThan(0)
    expect(dustAt(15)).toBeLessThan(dustAt(19))
    for (const t of [19, 20, 21, 22]) expect(dustShape(dustAt(t)).opacity).toBeGreaterThan(0.5)
    expect(dustShape(dustAt(20)).radius).toBeGreaterThan(15)
    expect(dustShape(dustAt(20)).height).toBeLessThan(1)
    expect(dustShape(dustAt(21)).radius).toBeGreaterThan(dustShape(dustAt(19)).radius)
    expect(dustAt(23.1)).toBe(0)
    expect(dustShape(0).opacity).toBe(0)
  })

  it('lights the lander during the descent only', () => {
    expect(descentFill(0)).toBe(1)
    expect(descentFill(20)).toBe(1)
    expect(descentFill(24)).toBe(0)
  })

  it('covers 0 to 24 s with outside shots and two cabin shots', () => {
    for (let t = 0; t < DESCENT_DURATION; t += 0.5) expect(selectShot(DESCENT_SHOTS, t)).not.toBeNull()
    expect(selectShot(DESCENT_SHOTS, 8)?.fov).toBe(80)
    expect(selectShot(DESCENT_SHOTS, 22)?.fov).toBe(60)
    expect(cabinShotAt(DESCENT_SHOTS, 5)).toBe(true)
    expect(cabinShotAt(DESCENT_SHOTS, 18)).toBe(true)
    expect(cabinShotAt(DESCENT_SHOTS, 10)).toBe(false)
  })

  it('puts the cabin eye at the helmet of a standing pilot, not at the belly', () => {
    const shot = DESCENT_SHOTS.find((s) => s.name === 'cabin-panel')!
    const p = shot.cam(0.5, 5).position
    const h = landerHeight(5)
    // Floor is 3.0 m above the lander base; the eye is about 1.5 m over it.
    expect(p.y - h - 3.0).toBeGreaterThan(1.3)
    expect(p.y - h - 3.0).toBeLessThan(1.7)
    expect(Math.hypot(p.x, p.z)).toBeLessThan(1.2)
  })

  it('runs the DSKY and radio events at their times', () => {
    const log: string[] = []
    const def = {
      duration: DESCENT_DURATION,
      events: descentEvents({
        say: (id) => log.push(`say:${id}`),
        dsky: (r) => log.push(`dsky:${r.prog}/${r.verb}/${r.noun}/${r.alarm}`),
        beep: () => log.push('beep'),
        moment: (id) => log.push(`moment:${id}`),
        print: (id) => log.push(`print:${id}`),
      }),
    }
    const at = (t: number): void => {
      log.length = 0
      dueEvents(def, 0, 0, t).forEach((e) => e.run())
    }
    at(0.5)
    expect(log).toEqual(['dsky:63/16/68/null', 'say:act4.go'])
    at(4)
    expect(log.slice(-5)).toEqual(['dsky:63/16/68/1202', 'beep', 'say:act4.alarm', 'say:act4.alarmask', 'moment:alarm-1202'])
    at(8)
    expect(log.slice(-2)).toEqual(['dsky:64/6/63/null', 'say:act4.goalarm'])
    at(11)
    expect(log.slice(-2)).toEqual(['dsky:64/6/63/1201', 'beep'])
    at(21.5)
    expect(log).toContain('say:act4.sixty')
    expect(log.slice(-3)).toEqual(['say:act4.contact', 'say:act4.stop', 'say:act4.stopack'])
    expect(log).toContain('say:act4.landing')
    expect(log).toContain('say:act4.dust')
    at(22.6)
    expect(log.slice(-4)).toEqual(['say:act4.landed', 'say:act4.landedok', 'moment:eagle-landed', 'print:control'])
    expect(sortedEvents(def).map((e) => e.at)).toEqual([0, 0.5, 4, 8, 9, 11, 11.5, 12.5, 13, 17, 21.5, 22.6])
  })
})

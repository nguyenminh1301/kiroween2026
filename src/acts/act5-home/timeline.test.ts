import { describe, expect, it } from 'vitest'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { MAX_OFFSET, MAX_ROT, shakeSample } from '../../engine/shakeNoise'
import { sortedEvents } from '../../timeline/timeline'
import {
  capsuleY,
  collarProgress,
  altitudeAt,
  DROGUE_ALTITUDE,
  ESCORTS,
  escortAt,
  MAINS_ALTITUDE,
  skyBlend,
  drogueOn,
  events,
  fadeLevel,
  PRINT_TAIL,
  heat,
  height,
  heliLevel,
  mainsOpen,
  oceanLevel,
  shotAt,
  shakeEnvelope,
  SHOTS,
  splashProgress,
  type Hooks,
} from './timeline'
import { HELI_FROM, HELI_HOVER, heliPos } from './heli'

function recorder() {
  const log: string[] = []
  const hooks: Hooks = {
    say: (id, o) => log.push(o?.focus ? `${id}+focus` : id),
    playSound: (n) => log.push(n),
    setSky: (c) => log.push(`sky ${c}`),
    hideEarth: () => log.push('earth off'),
    fadeOut: () => log.push('fade'),
    moment: (id) => log.push(`moment ${id}`),
    print: (id) => log.push(`print ${id}`),
    complete: () => log.push('complete'),
  }
  return { log, hooks }
}

describe('formulas', () => {
  it('heat rises, holds and falls', () => {
    expect(heat(0)).toBe(0)
    expect(heat(4)).toBe(0)
    expect(heat(7)).toBeCloseTo(0.5)
    expect(heat(10)).toBe(1)
    expect(heat(18)).toBe(1)
    expect(heat(19.5)).toBeCloseTo(0.5)
    expect(heat(21)).toBe(0)
    expect(heat(40)).toBe(0)
  })
  it('height holds 900 then falls to the sea at 45 s', () => {
    expect(height(0)).toBe(900)
    expect(height(31)).toBe(900)
    expect(height(38)).toBeCloseTo(900 * 0.5 ** 1.3)
    expect(height(45)).toBe(0)
    expect(height(60)).toBe(0)
  })
  it('drogues, mains and splash windows', () => {
    expect(drogueOn(20.9)).toBe(false)
    expect(drogueOn(21)).toBe(true)
    expect(drogueOn(29)).toBe(false)
    expect(mainsOpen(28)).toBe(0)
    expect(mainsOpen(29.5)).toBeCloseTo(0.3, 1)
    expect(mainsOpen(31)).toBeCloseTo(0.3, 1)
    expect(mainsOpen(36.2)).toBe(1)
    expect(splashProgress(45)).toBe(0)
    expect(splashProgress(48.5)).toBeCloseTo(0.5)
    expect(splashProgress(52)).toBe(1)
    expect(collarProgress(56)).toBe(0)
    expect(collarProgress(60)).toBe(1)
    expect(capsuleY(30)).toBe(900)
    expect(capsuleY(50)).toBeCloseTo(0.5)
  })
  it('opens the drogues near 7 km and the mains near 3 km, with no stars in the air after the burn', () => {
    expect(altitudeAt(21)).toBeCloseTo(DROGUE_ALTITUDE, 0)
    expect(altitudeAt(21) / 0.3048).toBeGreaterThan(23000)
    expect(altitudeAt(21) / 0.3048).toBeLessThan(25000)
    expect(altitudeAt(28.2)).toBeCloseTo(MAINS_ALTITUDE, 0)
    expect(altitudeAt(28.2) / 0.3048).toBeGreaterThan(9500)
    expect(altitudeAt(28.2) / 0.3048).toBeLessThan(10500)
    expect(altitudeAt(45)).toBe(0)
    for (let t = 0.5; t < 45; t += 0.5) expect(altitudeAt(t)).toBeLessThanOrEqual(altitudeAt(t - 0.5))
    expect(skyBlend(19.5)).toBe(0)
    expect(skyBlend(40)).toBe(1)
    // From 19.5 s on, every outside shot is in the air set, never the space set.
    for (let t = 19.5; t < 72; t += 0.25) expect(shotAt(t)?.view ?? 'ocean').toBe('ocean')
  })
  it('escorts sit 1 to 3 km out and steam on', () => {
    expect(ESCORTS).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      const e = escortAt(i, 0)
      expect(Math.hypot(e.x, e.z)).toBeGreaterThan(1000)
      expect(Math.hypot(e.x, e.z)).toBeLessThan(3000)
      expect(escortAt(i, 60).x).not.toBe(e.x)
    }
  })
  it('fade and audio levels', () => {
    expect(fadeLevel(71)).toBe(0)
    expect(fadeLevel(72)).toBeCloseTo(0.5)
    expect(fadeLevel(73)).toBe(1)
    expect(fadeLevel(71 + 17, 17)).toBe(0)
    expect(fadeLevel(73 + 17, 17)).toBe(1)
    expect(oceanLevel(30, true)).toBe(0)
    expect(oceanLevel(40, true)).toBe(0.5)
    expect(oceanLevel(50, false)).toBe(0.1)
    expect(heliLevel(40, true)).toBe(0)
    expect(heliLevel(60, true)).toBe(1)
    expect(heliLevel(60, false)).toBeCloseTo(0.3)
  })
  it('shakes hardest at peak heating and at the chute openings, and never past the launch cap', () => {
    expect(shakeEnvelope(2)).toBe(0)
    expect(shakeEnvelope(14)).toBeGreaterThan(shakeEnvelope(8))
    expect(shakeEnvelope(14)).toBeGreaterThan(shakeEnvelope(17.5))
    expect(shakeEnvelope(21.1)).toBeGreaterThan(0.7)
    expect(shakeEnvelope(28.3)).toBeGreaterThan(0.7)
    expect(shakeEnvelope(35)).toBe(0)
    for (let t = 0; t < 72; t += 0.05) {
      const s = shakeSample(shakeEnvelope(t), t, false)
      expect(Math.hypot(s.rx, s.ry, s.rz)).toBeLessThanOrEqual(Math.hypot(MAX_ROT, MAX_ROT, MAX_ROT) + 1e-12)
      expect(Math.abs(s.ox)).toBeLessThanOrEqual(MAX_OFFSET)
      expect(Math.abs(s.oy)).toBeLessThanOrEqual(MAX_OFFSET)
      expect(Math.abs(s.oz)).toBeLessThanOrEqual(MAX_OFFSET)
      expect(Math.abs(s.rx)).toBeLessThanOrEqual(MAX_ROT)
    }
  })
  it('keeps the sea a soft bed: quieter after splashdown than on the approach', () => {
    expect(oceanLevel(50, true)).toBeLessThan(oceanLevel(40, true))
    expect(oceanLevel(50, true)).toBeLessThanOrEqual(0.25)
    expect(oceanLevel(50, false)).toBeLessThanOrEqual(0.12)
  })
  it('shots do not overlap and sit in the timeline', () => {
    for (let i = 1; i < SHOTS.length; i++) expect(SHOTS[i].from).toBeGreaterThanOrEqual(SHOTS[i - 1].to)
    expect(shotAt(8)?.view).toBe('entry')
    expect(shotAt(15)).toBeNull()
    expect(shotAt(33)?.name).toBe('mains')
    expect(shotAt(33)?.fov).toBe(62)
  })
})

describe('events', () => {
  it('fire once, in order, with the right content', () => {
    const r = recorder()
    const player = new TimelinePlayer({ duration: 73.5, events: events(r.hooks) }, { reducedMotion: () => false })
    for (let i = 0; i < 1500; i++) player.step(0.05)
    expect(r.log).toEqual([
      'act5.cleared+focus',
      'act5.gear',
      'act5.hill',
      'act5.later+focus',
      'sky #ff7a2a',
      'earth off',
      'reentry',
      'static',
      'act5.blackout+focus',
      'sky #ffa25a',
      'act5.aria',
      'act5.airboss',
      'sky #5e8fc8',
      'chute',
      'act5.drogues+focus',
      'chute',
      'act5.mains+focus',
      'sky #8fb6dd',
      'act5.hornet',
      'act5.hornetack',
      'act5.alt',
      'act5.swim',
      'splash',
      'act5.splash',
      'act5.okay+focus',
      'print raft',
      'moment hornet',
      'horn',
      'print lifted',
      'act5.end',
      'fade',
      'complete',
    ])
    expect(sortedEvents({ duration: 73.5, events: events(r.hooks) }).map((e) => e.at)).toEqual([
      0.8, 0.9, 9.8, 9.9, 12.3, 16, 16.2, 17.5, 18.6, 18.7, 19.5, 21, 21.8, 28.2, 29, 30.5, 31, 31.1, 38, 38.1, 45.1,
      47.4, 47.9, 50, 52, 56.6, 62, 71, 73,
    ])
  })
  it('adds the two last prints after the narrator when prints are on, and fades later', () => {
    const r = recorder()
    const player = new TimelinePlayer({ duration: 73.5 + PRINT_TAIL, events: events(r.hooks, PRINT_TAIL) }, { reducedMotion: () => false })
    for (let i = 0; i < 2000; i++) player.step(0.05)
    const tail = r.log.slice(r.log.indexOf('act5.end'))
    expect(tail).toEqual(['act5.end', 'print quarantineWalk', 'print quarantineTrailer', 'fade', 'complete'])
    const times = sortedEvents({ duration: 73.5 + PRINT_TAIL, events: events(r.hooks, PRINT_TAIL) }).map((e) => e.at)
    expect(times.slice(-5)).toEqual([62, 71.4, 80, 88, 90])
  })
  it('stop mid-timeline fires nothing more', () => {
    const r = recorder()
    const player = new TimelinePlayer({ duration: 73.5, events: events(r.hooks) }, { reducedMotion: () => false })
    for (let i = 0; i < 100; i++) player.step(0.1)
    const n = r.log.length
    player.stop()
    for (let i = 0; i < 800; i++) player.step(0.1)
    expect(r.log.length).toBe(n)
    expect(r.log).not.toContain('complete')
  })
})

describe('helicopter ease', () => {
  it('starts at the carrier and ends at the hover point', () => {
    expect(heliPos(40)).toEqual(HELI_FROM)
    expect(heliPos(46)).toEqual(HELI_FROM)
    expect(heliPos(58)).toEqual(HELI_HOVER)
    expect(heliPos(70)).toEqual(HELI_HOVER)
    const mid = heliPos(52)
    expect(mid.x).toBeCloseTo((HELI_FROM.x + HELI_HOVER.x) / 2)
    expect(HELI_HOVER).toEqual({ x: 9, y: 11, z: 4 })
  })
})

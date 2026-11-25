import { describe, expect, it } from 'vitest'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { sortedEvents, shakeAmplitude } from '../../timeline/timeline'
import {
  capsuleY,
  collarProgress,
  destroyerZ,
  drogueOn,
  events,
  fadeLevel,
  heat,
  height,
  heliLevel,
  mainsOpen,
  oceanLevel,
  shotAt,
  SHAKE,
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
    expect(mainsOpen(29.5)).toBeCloseTo(0.5)
    expect(mainsOpen(31)).toBe(1)
    expect(splashProgress(45)).toBe(0)
    expect(splashProgress(48.5)).toBeCloseTo(0.5)
    expect(splashProgress(52)).toBe(1)
    expect(collarProgress(56)).toBe(0)
    expect(collarProgress(60)).toBe(1)
    expect(capsuleY(30)).toBe(900)
    expect(capsuleY(50)).toBeCloseTo(0.5)
  })
  it('destroyer, fade and audio levels', () => {
    expect(destroyerZ(20)).toBe(330)
    expect(destroyerZ(41)).toBe(270)
    expect(fadeLevel(69.5)).toBe(0)
    expect(fadeLevel(70.5)).toBeCloseTo(0.5)
    expect(fadeLevel(72)).toBe(1)
    expect(oceanLevel(30, true)).toBe(0)
    expect(oceanLevel(40, true)).toBe(1)
    expect(oceanLevel(50, false)).toBe(0.35)
    expect(heliLevel(40, true)).toBe(0)
    expect(heliLevel(60, true)).toBe(1)
    expect(heliLevel(60, false)).toBeCloseTo(0.3)
  })
  it('shake keys match the plan', () => {
    const at = (t: number) => shakeAmplitude(SHAKE, t, false)
    expect(at(2)).toBeCloseTo(0.005)
    expect(at(12)).toBe(0.05)
    expect(at(16)).toBe(0.09)
    expect(at(21)).toBe(0.08)
    expect(at(26)).toBe(0)
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
    const player = new TimelinePlayer({ duration: 72, events: events(r.hooks) }, { reducedMotion: () => false })
    for (let i = 0; i < 1500; i++) player.step(0.05)
    expect(r.log).toEqual([
      'act5.entry+focus',
      'sky #ff7a2a',
      'earth off',
      'reentry',
      'static',
      'act5.blackout+focus',
      'sky #ffa25a',
      'sky #5e8fc8',
      'chute',
      'act5.radar',
      'chute',
      'act5.mains+focus',
      'sky #8fb6dd',
      'splash',
      'act5.splash',
      'act5.hornet',
      'horn',
      'act5.end',
      'fade',
      'complete',
    ])
    expect(sortedEvents({ duration: 72, events: events(r.hooks) }).map((e) => e.at)).toEqual(
      [0.8, 12.3, 13.2, 13.2, 17.5, 19.5, 21, 26.3, 28.2, 29, 30.5, 45.1, 50, 52, 62, 69.5, 71.5],
    )
  })
  it('stop mid-timeline fires nothing more', () => {
    const r = recorder()
    const player = new TimelinePlayer({ duration: 72, events: events(r.hooks) }, { reducedMotion: () => false })
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

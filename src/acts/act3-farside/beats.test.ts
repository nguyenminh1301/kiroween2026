import { describe, expect, it } from 'vitest'
import { createBeats, initialVitals, type BeatDeps, type Crew, type SayOpts } from './beats'

function harness(first: Crew | null = null) {
  const log: string[] = []
  const pending: Array<{ left: number; fn: () => void }> = []
  const blackouts: number[] = []
  const deps: BeatDeps = {
    say: (id, opts?: SayOpts) => {
      log.push(`say:${id}`)
      // Each line lasts one second on this clock.
      if (opts?.then) pending.push({ left: 1, fn: opts.then })
    },
    setObjective: (k) => log.push(`obj:${k}`),
    hint: (h) => log.push(`hint:${h}`),
    tension: (e) => log.push(`tension:${e}`),
    checkpoint: (c) => log.push(`cp:${c}`),
    anomaly: (a) => log.push(`anomaly:${a}`),
    sfx: (s) => log.push(`sfx:${s}`),
    blackout: (v) => blackouts.push(v),
    getUp: () => log.push('getUp'),
    openCage: () => log.push('openCage'),
    carry: (w) => log.push(`carry:${w}`),
    layDown: (w) => log.push(`layDown:${w}`),
    setSilent: (on) => log.push(`silent:${on}`),
    startLunge: () => log.push('startLunge'),
    wakeUp: () => log.push('wakeUp'),
    openChoice: (o) => log.push(`choice:${o}`),
    storeChoice: (c) => log.push(`store:${c}`),
    restart: () => log.push('restart'),
    complete: () => log.push('complete'),
    firstCarried: () => first,
  }
  const beats = createBeats(deps)
  let z = 0
  const run = (secs: number, nz?: number): void => {
    for (let t = 0; t < secs - 1e-9; t += 0.05) {
      if (nz !== undefined) z = nz
      beats.tick(0.05, { z })
      for (const p of pending.splice(0)) {
        p.left -= 0.05
        if (p.left > 0) pending.push(p)
        else p.fn()
      }
    }
  }
  const at = (nz: number): void => run(0.05, nz)
  return { beats, log, run, at, blackouts }
}

describe('act 3 dream beats', () => {
  it('wakes in the bag, then stands up with the find objective', () => {
    const h = harness()
    h.beats.start('start', 6.6)
    expect(h.beats.phase()).toBe('wake')
    expect(h.beats.frozen()).toBe(true)
    h.run(2.5)
    expect(h.log.slice(0, 3)).toEqual(['say:act3.around', 'say:act3.aroundack', 'say:act3.los'])
    expect(h.log).not.toContain('getUp')
    h.run(4)
    expect(h.log).toContain('getUp')
    expect(h.log).toContain('obj:act3Find')
    expect(h.beats.phase()).toBe('explore')
    expect(h.beats.frozen()).toBe(false)
  })

  it('sets wp0 at the junction and plays the impostor once', () => {
    const h = harness()
    h.beats.start('start', 6.6)
    h.run(8)
    h.at(-4)
    h.at(-6)
    expect(h.log).toContain('cp:wp0')
    h.at(-13)
    h.at(-15)
    h.at(-13)
    h.at(-15)
    expect(h.log.filter((l) => l === 'anomaly:loss-of-signal')).toHaveLength(1)
    expect(h.log.filter((l) => l === 'say:act3.impostor')).toHaveLength(1)
  })

  it('sets wp1 at the cage, opens it, and carries the chosen crewman', () => {
    const h = harness()
    h.beats.start('wp0', -4.4)
    h.at(-27)
    h.at(-29)
    expect(h.log).toContain('cp:wp1')
    expect(h.log).toContain('say:act3.cage')
    expect(h.beats.phase()).toBe('cage')
    h.beats.pickUp('cmp')
    expect(h.beats.carrying()).toBeNull()
    h.beats.useCage()
    expect(h.log).toContain('openCage')
    h.beats.pickUp('cmp')
    expect(h.log).toContain('carry:cmp')
    expect(h.log).toContain('obj:act3Carry')
    expect(h.beats.carriedFirst()).toBe('cmp')
    expect(h.beats.second()).toBe('cdr')
  })

  it('whispers while carrying, subtitles only', () => {
    const h = harness()
    h.beats.start('wp1', -28.2)
    h.beats.useCage()
    h.beats.pickUp('cdr')
    h.run(8)
    expect(h.log).toContain('say:act3.carry.cdr')
  })

  it('lays him down at the bag: wp2, silent, go back', () => {
    const h = harness()
    h.beats.start('wp1', -28.2)
    h.beats.useCage()
    h.beats.pickUp('cdr')
    h.beats.layDown('cmp')
    expect(h.beats.phase()).toBe('carry')
    h.beats.layDown('cdr')
    expect(h.log).toContain('cp:wp2')
    expect(h.log).toContain('layDown:cdr')
    expect(h.log).toContain('say:act3.down.cdr')
    expect(h.log).toContain('silent:true')
    expect(h.log).toContain('obj:act3Back')
    expect(h.beats.phase()).toBe('silent')
    expect(h.beats.hunting()).toBe(false)
  })

  it('says the hold line from the cage the first time he hides while hunted, and the heard line once', () => {
    const h = harness()
    h.beats.start('wp0', -4.4)
    h.beats.hidden(true)
    expect(h.log).not.toContain('say:act3.hold')
    h.beats.hidden(false)
    h.beats.alert()
    h.beats.alert()
    expect(h.log.filter((l) => l === 'say:act3.heard')).toHaveLength(1)
    h.beats.hidden(true)
    h.beats.hidden(true)
    expect(h.log.filter((l) => l === 'say:act3.hold')).toHaveLength(1)
    h.beats.lost()
    expect(h.log).toContain('say:act3.lost')
  })

  it('makes no creature events matter in the silent phase', () => {
    const h = harness('cdr')
    h.beats.start('wp2', 5.9)
    h.beats.alert()
    h.beats.caught()
    expect(h.log).not.toContain('sfx:sting')
    expect(h.beats.phase()).toBe('silent')
  })

  it('sets wp3 at the cage on the way back and swallows him when E on the second', () => {
    const h = harness('cdr')
    h.beats.start('wp2', 5.9)
    h.run(2)
    h.at(-20)
    h.at(-29)
    expect(h.log).toContain('cp:wp3')
    expect(h.beats.phase()).toBe('final')
    h.beats.useSecond()
    expect(h.log).toContain('startLunge')
    expect(h.beats.lungeTime()).toBe(0)
    h.run(1.15)
    expect(h.log).not.toContain('sfx:sting')
    h.run(0.1)
    expect(h.log).toContain('sfx:sting')
    expect(h.beats.phase()).toBe('lunge')
    const before = h.blackouts.length
    h.run(0.3)
    expect(h.beats.phase()).toBe('black')
    // The cut to black is one step: no fade values between the lunge and full black.
    expect(h.blackouts.slice(before)).toEqual([1])
  })

  it('wakes after one second of black, then the lines, then the choice and the reply', () => {
    const h = harness('cdr')
    h.beats.start('wp3', -28.2)
    h.beats.useSecond()
    h.run(1.55)
    expect(h.beats.phase()).toBe('black')
    h.run(0.9)
    expect(h.log).not.toContain('wakeUp')
    h.run(0.2)
    expect(h.log).toContain('wakeUp')
    expect(h.log).toContain('sfx:gasp')
    h.run(1.7)
    expect(h.log).toContain('say:act3.wake.cmp')
    h.run(1.1)
    expect(h.log).toContain('say:act3.wake.cdr')
    expect(h.beats.choose('dream')).toBe(false)
    h.run(1.1)
    expect(h.beats.phase()).toBe('choice')
    expect(h.log).toContain('choice:true')
    expect(h.beats.choose('dream')).toBe(true)
    expect(h.log).toContain('store:dream')
    expect(h.log).toContain('say:act3.reply.dream')
    expect(h.beats.choose('fine')).toBe(false)
    h.run(1.2)
    expect(h.beats.phase()).toBe('out')
    expect(h.log).not.toContain('complete')
    h.run(1.6)
    expect(h.log).toContain('complete')
  })

  it('swallows him when caught, then restarts after one second of black', () => {
    const h = harness()
    h.beats.start('wp1', -28.2)
    h.run(1.1)
    h.beats.useCage()
    h.beats.pickUp('cdr')
    h.beats.caught()
    expect(h.beats.phase()).toBe('caught')
    expect(h.log).toContain('startLunge')
    expect(h.beats.frozen()).toBe(true)
    h.run(1.25)
    expect(h.log).toContain('sfx:sting')
    h.run(0.3)
    expect(h.blackouts[h.blackouts.length - 1]).toBe(1)
    h.run(0.9)
    expect(h.log).not.toContain('restart')
    h.run(0.2)
    expect(h.log).toContain('restart')
  })

  it('does not count paused time: no tick, no progress', () => {
    const h = harness()
    h.beats.start('start', 6.6)
    h.run(1)
    expect(h.log).not.toContain('getUp')
  })

  it('starts calm at wp2 and wp3, tense elsewhere', () => {
    expect(initialVitals('wp2').tension).toBe('CALM')
    expect(initialVitals('wp3').tension).toBe('CALM')
    expect(initialVitals('wp1').tension).toBe('STALK')
  })
})

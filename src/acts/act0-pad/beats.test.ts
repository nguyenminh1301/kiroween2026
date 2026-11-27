import { describe, expect, it } from 'vitest'
import { createBeats, type BeatDeps } from './beats'

function setup() {
  const log: string[] = []
  const pending = new Map<string, () => void>()
  const deps: BeatDeps = {
    say(id, opts, done) {
      log.push(`say:${id}`)
      opts.onStart?.()
      pending.set(id, done)
    },
    setObjective: (k) => log.push(`obj:${k}`),
    showHint: (id) => log.push(`hint:${id}`),
    cheer: (l) => log.push(`cheer:${l}`),
    playSound: (n) => log.push(`sound:${n}`),
    setHatch: (_h, _o, f) => {
      if (f >= 1 && !log.includes('black')) log.push('black')
    },
    lock: () => log.push('lock'),
    complete: () => log.push('complete'),
  }
  const beats = createBeats(deps)
  const end = (id: string) => pending.get(id)?.()
  const run = (seconds: number) => {
    for (let i = 0; i < seconds * 10; i++) beats.tick(0.1)
  }
  return { beats, log, end, run }
}

describe('act 0 beats', () => {
  it('runs the two narrator lines, then shows the wave objective, with no camera turn', () => {
    const { beats, log, end, run } = setup()
    run(0.5)
    expect(log).toEqual([])
    run(0.5)
    expect(log).toEqual(['hint:walk', 'say:act0.intro1'])
    end('act0.intro1')
    expect(log.slice(-1)).toEqual(['say:act0.intro2'])
    end('act0.intro2')
    expect(log.slice(-1)).toEqual(['obj:act0Wave'])
    expect(log).not.toContain('say:act0.pad1')
    expect(beats.state().waved).toBe(false)
  })

  it('does not set the wave objective when the player already waved', () => {
    const { beats, log, end, run } = setup()
    run(1)
    end('act0.intro1')
    beats.wave()
    end('act0.intro2')
    expect(log).not.toContain('obj:act0Wave')
  })

  it('drops the old chain when the beat changes', () => {
    const { beats, log, end, run } = setup()
    run(1)
    beats.wave()
    end('act0.intro1')
    expect(log).not.toContain('say:act0.intro2')
  })

  it('wave gives the board objective once and the crew say the wave line', () => {
    const { beats, log } = setup()
    beats.wave()
    expect(log).toEqual(['cheer:1', 'obj:act0Board', 'say:act0.wave'])
    beats.wave()
    expect(log.filter((l) => l === 'obj:act0Board').length).toBe(1)
    expect(log.filter((l) => l === 'cheer:1').length).toBe(2)
  })

  it('crew speak only when talked to, and entering the room says nothing', () => {
    const { beats, log, end } = setup()
    beats.enterRoom()
    expect(log.some((l) => l.startsWith('say:'))).toBe(false)
    beats.talk('gunter')
    beats.talk('gunter')
    expect(log.filter((l) => l === 'say:act0.gunter1').length).toBe(1)
    end('act0.gunter1')
    beats.talk('gunter')
    expect(log.at(-1)).toBe('say:act0.gunter2')
  })

  it('launch control reports the countdown once, after the narrator, when the player reaches the arm', () => {
    const { beats, log, end, run } = setup()
    run(1)
    beats.reachArm()
    expect(log).not.toContain('say:act0.count')
    end('act0.intro1')
    end('act0.intro2')
    expect(log.indexOf('say:act0.count')).toBeGreaterThan(log.indexOf('say:act0.intro2'))
    beats.reachArm()
    expect(log.filter((l) => l === 'say:act0.count').length).toBe(1)
  })

  it('launch control still speaks when the wave came first', () => {
    const { beats, log, run } = setup()
    run(1)
    beats.reachArm()
    beats.wave()
    expect(log).toContain('say:act0.count')
  })

  it('each pad crewman has a line', () => {
    const { beats, log } = setup()
    beats.talk('tech1')
    beats.talk('tech2')
    expect(log).toEqual(['say:act0.tech1', 'say:act0.tech2'])
  })

  it('cheers every 9 s, 7 s after the wave, and stops in the room', () => {
    const { beats, log, run } = setup()
    run(9.1)
    expect(log.filter((l) => l.startsWith('cheer')).length).toBe(1)
    beats.wave()
    run(7.1)
    expect(log.filter((l) => l === 'cheer:0.7').length).toBe(2)
    beats.enterRoom()
    run(30)
    expect(log.filter((l) => l === 'cheer:0.7').length).toBe(2)
  })

  it('can board without talking to anyone', () => {
    const { beats, log, run } = setup()
    beats.board()
    run(6)
    expect(log.some((l) => l.startsWith('say:act0.tech') || l.startsWith('say:act0.gunter'))).toBe(false)
    expect(log.at(-1)).toBe('complete')
  })

  it('boards: lock, clear the objective, handle, hiss, creak, line, black, then complete once', () => {
    const { beats, log, run } = setup()
    beats.board()
    expect(log).toEqual(['lock', 'obj:null'])
    run(6)
    expect(log).toEqual([
      'lock',
      'obj:null',
      'sound:switch',
      'sound:hiss',
      'sound:creak',
      'say:act0.board',
      'black',
      'complete',
    ])
    beats.board()
    run(1)
    expect(log.filter((l) => l === 'complete').length).toBe(1)
  })
})

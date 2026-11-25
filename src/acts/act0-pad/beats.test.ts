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
    focusOn: () => log.push('focus'),
    headOf: (n) => () => ({ x: 0, y: n === 'pad0' ? 1 : 2, z: 0 }),
    setObjective: (k) => log.push(`obj:${k}`),
    showHint: (id) => log.push(`hint:${id}`),
    cheer: (l) => log.push(`cheer:${l}`),
    playSwitch: () => log.push('switch'),
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
  it('runs the intro lines, then pad1 with the wave objective', () => {
    const { beats, log, end, run } = setup()
    run(0.5)
    expect(log).toEqual([])
    run(0.5)
    expect(log).toEqual(['hint:walk', 'say:act0.intro1'])
    end('act0.intro1')
    expect(log.slice(-2)).toEqual(['say:act0.intro2', 'focus'])
    end('act0.intro2')
    // The objective shows when the pad1 line starts, not when it ends.
    expect(log.slice(-3)).toEqual(['say:act0.pad1', 'focus', 'obj:act0Wave'])
    end('act0.pad1')
    expect(log.filter((l) => l === 'obj:act0Wave').length).toBe(1)
    expect(beats.state().waved).toBe(false)
  })

  it('does not set the wave objective when the player already waved', () => {
    const { beats, log, end, run } = setup()
    run(1)
    end('act0.intro1')
    beats.wave()
    end('act0.intro2')
    end('act0.pad1')
    expect(log).not.toContain('obj:act0Wave')
  })

  it('drops the old chain when the beat changes', () => {
    const { beats, log, end, run } = setup()
    run(1)
    beats.wave()
    end('act0.intro1')
    expect(log).not.toContain('say:act0.intro2')
  })

  it('gives act0Board and pad2 once, then only cheers', () => {
    const { beats, log } = setup()
    beats.wave()
    expect(log).toEqual(['cheer:1', 'obj:act0Board', 'say:act0.pad2', 'focus'])
    beats.wave()
    expect(log.filter((l) => l === 'say:act0.pad2').length).toBe(1)
    expect(log.filter((l) => l === 'obj:act0Board').length).toBe(1)
    expect(log.filter((l) => l === 'cheer:1').length).toBe(2)
  })

  it('says pad3 once on entering the room', () => {
    const { beats, log } = setup()
    beats.enterRoom()
    beats.enterRoom()
    expect(log.filter((l) => l === 'say:act0.pad3').length).toBe(1)
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

  it('boards: switch, clear the objective, say board, then complete after the line ends', () => {
    const { beats, log, end } = setup()
    beats.board()
    expect(log).toEqual(['switch', 'obj:null', 'say:act0.board'])
    expect(log).not.toContain('complete')
    end('act0.board')
    expect(log.at(-1)).toBe('complete')
    beats.board()
    expect(log.filter((l) => l === 'complete').length).toBe(1)
  })
})

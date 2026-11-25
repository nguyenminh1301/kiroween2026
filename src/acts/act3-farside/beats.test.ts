import { describe, expect, it } from 'vitest'
import { createBeats, initialVitals, type BeatDeps, type SayOpts } from './beats'

function harness() {
  const log: string[] = []
  const pending: Array<{ left: number; fn: () => void }> = []
  const says: Array<{ id: string; opts?: SayOpts }> = []
  const deps: BeatDeps = {
    say: (id, opts) => {
      log.push(`say:${id}`)
      says.push({ id, opts })
      // Each line lasts one second on this clock.
      if (opts?.then) pending.push({ left: 1, fn: opts.then })
    },
    look: (t) => log.push(`look:${t}`),
    turnToHatch: () => log.push('turnToHatch'),
    setObjective: (k) => log.push(`obj:${k}`),
    hint: (h) => log.push(`hint:${h}`),
    tension: (e) => log.push(`tension:${e}`),
    checkpoint: (c) => log.push(`cp:${c}`),
    anomaly: (a) => log.push(`anomaly:${a}`),
    sfx: (s) => log.push(`sfx:${s}`),
    creatureSound: () => log.push('creatureSound'),
    blackout: () => {},
    edge: () => {},
    startEncounter: () => log.push('startEncounter'),
    revealCreature: (s) => log.push(`reveal:${s}`),
    startCrawl: () => log.push('crawl'),
    flash: (s) => log.push(`flash:${s}`),
    restart: () => log.push('restart'),
    complete: () => log.push('complete'),
  }
  const beats = createBeats(deps)
  let z = 0
  const step = (): void => {
    for (const p of pending.splice(0)) {
      p.left -= 0.05
      if (p.left > 0) pending.push(p)
      else p.fn()
    }
  }
  const run = (secs: number, opts: { z?: number; back?: boolean } = {}): void => {
    for (let t = 0; t < secs - 1e-9; t += 0.05) {
      if (opts.z !== undefined) z = opts.z
      beats.tick(0.05, { z, lookingBack: opts.back ?? false })
      step()
    }
  }
  const at = (nz: number): void => {
    z = nz
    beats.tick(0.05, { z, lookingBack: false })
    step()
  }
  return { beats, log, says, run, at }
}

describe('act 3 beat flow', () => {
  it('wakes with the LOS card, the whispers, then the find objective', () => {
    const h = harness()
    h.beats.start('start', 2.5)
    h.at(2.5)
    h.run(4, { z: 2.5 })
    expect(h.log).toContain('say:act3.los')
    expect(h.log).toContain('say:act3.wake')
    expect(h.log).toContain('say:act3.wake2')
    expect(h.log).toContain('obj:act3Find')
    expect(h.log).toContain('hint:push')
    h.at(-1.6)
    expect(h.log).toContain('say:act3.call1')
  })

  it('starts the encounter at z -5, then the sneak objective when it ends, and plays the impostor once', () => {
    const h = harness()
    h.beats.start('start', 2.5)
    h.at(2.5)
    h.at(-5.1)
    expect(h.log).toContain('startEncounter')
    expect(h.log).toContain('say:act3.see')
    expect(h.log).toContain('obj:act3Hide')
    expect(h.log).toContain('cp:wp0')
    h.beats.hidden(true)
    h.beats.hidden(true)
    expect(h.log.filter((l) => l === 'say:act3.hold')).toHaveLength(1)
    h.beats.encounterEnd()
    expect(h.log).toContain('obj:act3Sneak')
    expect(h.log).toContain('say:act3.passed')
    h.at(-12.1)
    h.at(-12.5)
    h.at(-11)
    h.run(1.5, { z: -12.2 })
    expect(h.log.filter((l) => l === 'say:act3.impostor')).toHaveLength(1)
    expect(h.log).toContain('anomaly:impostor-capcom')
    expect(h.log).toContain('say:act3.nohouston')
    const imp = h.says.find((s) => s.id === 'act3.impostor')
    expect(imp?.opts).toMatchObject({ speaker: 'UNKNOWN', detuneHz: 7 })
    expect(h.log).toContain('cp:wp1')
  })

  it('handles alert and lost', () => {
    const h = harness()
    h.beats.start('wp1', -12)
    h.beats.alert()
    expect(h.log).toContain('say:act3.heard')
    expect(h.log).toContain('tension:heard')
    expect(h.log).toContain('obj:act3Hunted')
    h.beats.lost()
    expect(h.log).toContain('say:act3.lost')
    expect(h.log.slice(-2)).toEqual(['tension:chaseEnd', 'tension:stalk'])
  })

  it('plays the reveal at z -38, then the chase, the hatch and completeAct', () => {
    const h = harness()
    h.beats.start('wp2', -31.5)
    h.at(-31.5)
    h.at(-38.2)
    expect(h.beats.phase()).toBe('reveal')
    expect(h.beats.frozen()).toBe(true)
    expect(h.log).toContain('say:act3.found')
    h.run(1.7, { z: -38.2 })
    expect(h.log).toContain('reveal:true')
    h.run(1.2, { z: -38.2 })
    expect(h.log).toContain('say:act3.cmp')
    expect(h.log).toContain('turnToHatch')
    h.run(1.4, { z: -38.2 })
    expect(h.beats.phase()).toBe('chase')
    expect(h.log).toContain('tension:chaseStart')
    expect(h.log).toContain('obj:act3Chase')
    expect(h.log).toContain('hint:chase')
    expect(h.beats.hatchEnabled()).toBe(true)
    expect(h.log).toContain('cp:wp3')
    // Pushes keep the gap up for a while; the commander calls.
    h.beats.push()
    h.run(3.5, { z: -30 })
    expect(h.log).toContain('say:act3.cdr.call1')
    h.beats.useHatch()
    expect(h.log).toContain('sfx:hatchSlam')
    expect(h.log).toContain('say:act3.slam')
    h.run(2, { z: 3 })
    expect(h.log.filter((l) => l === 'sfx:knock').length).toBeGreaterThanOrEqual(1)
    expect(h.log).toContain('complete')
  })

  it('catches the player when the gap closes, and restarts after 1.5 s', () => {
    const h = harness()
    h.beats.start('wp3', -38.5)
    h.run(1.5, { z: -38.5 })
    expect(h.beats.phase()).toBe('chase')
    for (let i = 0; i < 400 && h.beats.phase() === 'chase'; i++) h.run(0.05, { z: -38.5, back: true })
    expect(h.beats.phase()).toBe('caught')
    expect(h.log).toContain('flash:true')
    expect(h.log).not.toContain('restart')
    h.run(1.6, { z: -38.5 })
    expect(h.log).toContain('restart')
    expect(h.beats.checkpoint()).toBe('wp3')
  })

  it('has the vitals for each start', () => {
    expect(initialVitals('start')).toEqual({ tension: 'STALK', fear: 0.45, heartRate: 95 })
    expect(initialVitals('wp3')).toEqual({ tension: 'CHASE', fear: 0.9, heartRate: 150 })
  })
})

import { describe, expect, it } from 'vitest'
import { createMonster, startEncounter, stepMonster, type Monster, type MonsterCtx, type MonsterEvent } from './monster'

const far = { x: 0, z: 10 }
const ctx = (over: Partial<MonsterCtx> = {}): MonsterCtx => ({
  dt: 0.1,
  player: far,
  hidden: false,
  holding: false,
  noise: 0.12,
  rng: () => 0.5,
  ...over,
})

function run(m: Monster, seconds: number, over: Partial<MonsterCtx> = {}): MonsterEvent[] {
  const out: MonsterEvent[] = []
  for (let t = 0; t < seconds; t += 0.1) out.push(...stepMonster(m, ctx(over)))
  return out
}

describe('monster', () => {
  it('patrols along the loop at 0.8 m/s and makes sounds', () => {
    const m = createMonster(0)
    const ev = run(m, 10)
    expect(m.s).toBeCloseTo(8, 0)
    expect(m.pos.z).toBeCloseTo(-20.25, 0)
    expect(ev).toContain('sound')
  })

  it('alerts, hunts to the last known position, searches and gives up', () => {
    const m = createMonster(6)
    const player = { x: 0, z: -16 }
    const loud = { player, noise: 0.9 }
    const ev = run(m, 0.3, loud)
    expect(ev).toContain('alert')
    expect(m.mode).toBe('alert')
    run(m, 1.9, { player, noise: 0.12, hidden: true, holding: true })
    expect(m.mode).toBe('hunt')
    run(m, 6, { player: { x: 0, z: -2 }, noise: 0.1, hidden: true, holding: true })
    expect(['search', 'return', 'patrol']).toContain(m.mode)
    const ev2 = run(m, 4, { player: { x: 0, z: -2 }, noise: 0.1, hidden: true, holding: true })
    expect(ev2.includes('lost') || m.mode === 'patrol' || m.mode === 'return').toBe(true)
  })

  it('catches an unhidden player within 0.8 m, not a hidden one', () => {
    const m = createMonster(6)
    expect(run(m, 0.1, { player: { x: 0, z: -21.8 } })).toContain('caught')
    const m2 = createMonster(6)
    expect(run(m2, 0.1, { player: { x: 0, z: -21.8 }, hidden: true, holding: true })).not.toContain('caught')
  })

  it('runs the scripted encounter and resumes the patrol', () => {
    const m = createMonster(0)
    startEncounter(m)
    let minZ = 0
    let maxZ = -99
    const ev: MonsterEvent[] = []
    for (let t = 0; t < 40 && !ev.includes('encounterEnd'); t += 0.1) {
      ev.push(...stepMonster(m, ctx({ player: { x: 0, z: 2 } })))
      maxZ = Math.max(maxZ, m.pos.z)
    }
    minZ = m.pos.z
    expect(maxZ).toBeCloseTo(-7.2, 0)
    expect(ev).toContain('encounterEnd')
    expect(m.mode).toBe('patrol')
    expect(minZ).toBeCloseTo(-16.25, 0)
  })
})

import { describe, expect, it } from 'vitest'
import { ACT_ORDER } from '../engine/actOrder'
import { ACT_IMPORTS, importAct } from './registry'

const EXPECTED: Record<string, string[]> = {
  'act3-farside': ['start', 'wp0', 'wp1', 'wp2', 'wp3'],
  'act4-moon': ['start', 'tasks', 'run'],
}

describe('placeholder acts', () => {
  it('has one import per act id', () => {
    expect(Object.keys(ACT_IMPORTS).sort()).toEqual([...ACT_ORDER].sort())
  })

  it.each([...ACT_ORDER])('%s has the Act_Module shape and starts with "start"', async (id) => {
    const mod = await importAct(id)
    expect(mod.id).toBe(id)
    expect(typeof mod.Scene).toBe('function')
    expect(typeof mod.start).toBe('function')
    expect(mod.checkpoints.length).toBeGreaterThanOrEqual(1)
    expect(mod.checkpoints[0]).toBe('start')
    if (EXPECTED[id]) expect(mod.checkpoints).toEqual(EXPECTED[id])
    expect(() => mod.start('start')).not.toThrow()
  })

  it('rejects unknown ids', async () => {
    await expect(importAct('nope')).rejects.toThrow()
  })
})

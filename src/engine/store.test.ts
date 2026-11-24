import { beforeEach, describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gameStore } from './store'
import { DEFAULT_SETTINGS } from './settings'

describe('store', () => {
  beforeEach(() => gameStore.setState({ anomaliesSeen: [] }))

  // Feature: engine-core, Property 12: Anomaly dedup-insert
  it('addAnomalySeen keeps unique ids in first-appearance order', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ maxLength: 4 })),
        fc.array(fc.string({ maxLength: 4 })),
        (start, adds) => {
          gameStore.setState({ anomaliesSeen: [...start] })
          for (const id of adds) gameStore.getState().addAnomalySeen(id)
          const result = gameStore.getState().anomaliesSeen
          expect(new Set(result).size).toBe(result.length)
          expect(result).toEqual([...new Set([...start, ...adds])])
        },
      ),
      { numRuns: 100 },
    )
  })

  it('has the documented initial state', () => {
    const s = gameStore.getState()
    expect(s.screen).toBe('title')
    expect(s.act).toBeNull()
    expect(s.checkpoint).toBeNull()
    expect(s.paused).toBe(false)
    expect(s.moveMode).toBe('walk')
    expect(s.objective).toBeNull()
    expect(s.target).toBeNull()
    expect(s.settings).toEqual(DEFAULT_SETTINGS)
    expect(s.unlockedActs).toEqual(['act0-pad'])
  })

  it('setters update their field only', () => {
    const s = gameStore.getState()
    s.setScreen('play')
    s.setAct('act1-launch')
    s.setCheckpoint('wp1')
    s.setPaused(true)
    s.setMoveMode('zeroG')
    s.setObjective('Board')
    s.setTarget('hatch')
    s.setUnlockedActs(['act0-pad', 'act1-launch'])
    const n = gameStore.getState()
    expect(n.screen).toBe('play')
    expect(n.act).toBe('act1-launch')
    expect(n.checkpoint).toBe('wp1')
    expect(n.paused).toBe(true)
    expect(n.moveMode).toBe('zeroG')
    expect(n.objective).toBe('Board')
    expect(n.target).toBe('hatch')
    expect(n.unlockedActs).toEqual(['act0-pad', 'act1-launch'])
    expect(n.anomaliesSeen).toEqual([])
    gameStore.setState({
      screen: 'title', act: null, checkpoint: null, paused: false, moveMode: 'walk',
      objective: null, target: null, unlockedActs: ['act0-pad'],
    })
  })
})

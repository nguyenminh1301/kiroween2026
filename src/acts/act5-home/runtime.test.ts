import { afterEach, describe, expect, it, vi } from 'vitest'

const log: string[] = []
let soundStopped = false

vi.mock('../../audio', async () => {
  const { cleanupRegistry } = await import('../../engine/cleanupRegistry')
  return {
    audio: { play: (n: string) => log.push(`play ${n}`), setScene: () => {}, setReentry: () => {}, stopReentry: () => {} },
    radio: {
      say: (id: string) => {
        log.push(`say ${id}`)
        return Promise.resolve()
      },
    },
    startAudioSession: () => {
      soundStopped = false
      cleanupRegistry.register(() => {
        soundStopped = true
      })
    },
  }
})
vi.mock('../../engine/actFlow', () => ({ completeAct: () => log.push('complete') }))

const { cleanupRegistry } = await import('../../engine/cleanupRegistry')
const { frameDriver } = await import('../../engine/frameDriver')
const { gameStore } = await import('../../engine/store')
const { startAct5 } = await import('./runtime')
const { act5State } = await import('./state')

const run = (seconds: number): void => {
  for (let i = 0; i < seconds / 0.05; i++) frameDriver.step(0.05)
}

describe('act 5 runtime', () => {
  afterEach(() => {
    cleanupRegistry.runAll()
    log.length = 0
  })

  it('starts uneasy and plays every event once through to the end', () => {
    gameStore.getState().setPaused(false)
    startAct5()
    const s = gameStore.getState()
    expect(s.tension).toBe('UNEASE')
    expect(s.heartRate).toBe(100)
    expect(s.fear).toBeCloseTo(0.2)
    run(91)
    expect(log.filter((l) => l.startsWith('say'))).toEqual([
      'say act5.cleared',
      'say act5.gear',
      'say act5.hill',
      'say act5.later',
      'say act5.blackout',
      'say act5.aria',
      'say act5.airboss',
      'say act5.drogues',
      'say act5.mains',
      'say act5.hornet',
      'say act5.hornetack',
      'say act5.alt',
      'say act5.swim',
      'say act5.splash',
      'say act5.okay',
      'say act5.end',
    ])
    expect(log.filter((l) => l === 'complete')).toHaveLength(1)
    expect(log[log.length - 1]).toBe('complete')
  })

  it('quitting mid-timeline fires nothing more and stops all sound', () => {
    gameStore.getState().setPaused(false)
    startAct5()
    run(17)
    expect(act5State.t).toBeGreaterThan(16.5)
    const n = log.length
    expect(log).toContain('say act5.blackout')
    cleanupRegistry.runAll()
    expect(soundStopped).toBe(true)
    run(70)
    expect(log.length).toBe(n)
  })
})

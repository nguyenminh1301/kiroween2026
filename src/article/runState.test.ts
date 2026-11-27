import { describe, expect, it } from 'vitest'
import { hostMessage } from '../engine/hostBridge'
import { IDLE_RUN, reduceRun } from './runState'

describe('reduceRun', () => {
  it('is a run after the first act, also between acts', () => {
    let s = reduceRun(IDLE_RUN, hostMessage.act('act0-pad'))
    expect(s.running).toBe(true)
    s = reduceRun(s, hostMessage.act(null))
    expect(s.running).toBe(true)
    expect(s.act).toBe('act0-pad')
  })
  it('tracks the hunt in act 3 only and clears it on the next act', () => {
    let s = reduceRun(IDLE_RUN, hostMessage.act('act1-launch'))
    expect(reduceRun(s, hostMessage.hunt(true)).hunting).toBe(false)
    s = reduceRun(s, hostMessage.act(null))
    s = reduceRun(s, hostMessage.dream(true))
    s = reduceRun(s, hostMessage.act('act3-farside'))
    expect(s.dreaming).toBe(true)
    s = reduceRun(s, hostMessage.hunt(true))
    expect(s.hunting).toBe(true)
    expect(reduceRun(s, hostMessage.dream(false))).toMatchObject({ dreaming: false, hunting: false })
    s = reduceRun(s, hostMessage.act('act4-moon'))
    expect(s).toMatchObject({ dreaming: false, hunting: false })
  })
  it('ends and leaves', () => {
    const s = reduceRun(IDLE_RUN, hostMessage.act('act5-home'))
    expect(reduceRun(s, hostMessage.end())).toMatchObject({ running: false, ended: true })
    expect(reduceRun(s, hostMessage.leave())).toMatchObject({ running: false, ended: false })
  })
})

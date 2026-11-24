import { describe, expect, it } from 'vitest'
import { dskyAfterPress, initialDsky } from './dsky'
import { createStages } from './stages'

describe('DSKY', () => {
  it('starts on PROG 01 with COMP ACTY on', () => {
    const d = initialDsky()
    expect(d.prog).toBe('01')
    expect(d.lamps).toEqual({ compActy: true, keyRel: false, progAlarm: false })
  })

  it('shows the scripted display after each press', () => {
    const s = createStages()
    s.launchDone()
    s.flip()
    s.press()
    expect(s.dsky()).toMatchObject({ prog: '01', verb: '37' })
    s.press()
    expect(s.dsky()).toMatchObject({ prog: '15', verb: '06', noun: '33', r1: '+00002', r2: '+00044', r3: '+01600' })
    s.press()
    expect(s.dsky()).toMatchObject({ prog: '15', verb: '16', noun: '95', r1: '+10421', r2: '+00003', r3: '+00000' })
  })

  it('does nothing outside the key-in stage', () => {
    const s = createStages()
    expect(s.press()).toBe(0)
    s.launchDone()
    expect(s.press()).toBe(0)
    s.flip()
    expect(s.press()).toBe(1)
    s.press()
    s.press()
    const after = s.dsky()
    expect(s.press()).toBe(0)
    expect(s.dsky()).toEqual(after)
    expect(dskyAfterPress(initialDsky(), 9)).toEqual(initialDsky())
  })
})

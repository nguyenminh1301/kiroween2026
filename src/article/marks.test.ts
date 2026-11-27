import { describe, expect, it } from 'vitest'
import { serializeSaved, DEFAULT_SETTINGS, parseSaved } from '../engine/settings'
import { MOMENT_IDS } from '../content/archive'
import { momentMarks } from './marks'

const save = (extra: object) =>
  JSON.stringify({ ...JSON.parse(serializeSaved({ settings: DEFAULT_SETTINGS, unlockedActs: ['act0-pad'] })), ...extra })

describe('moment marks', () => {
  it('shows no marks when nothing was played or the save is missing or broken', () => {
    expect(momentMarks(null, MOMENT_IDS)).toBeNull()
    expect(momentMarks('{oops', MOMENT_IDS)).toBeNull()
    expect(momentMarks(save({}), MOMENT_IDS)).toBeNull()
  })

  it('marks each moment seen or missed from the saved ids', () => {
    const marks = momentMarks(save({ played: true, seen: ['hornet', 'alarm-1202', 'test-box'] }), MOMENT_IDS)!
    expect(marks['hornet']).toBe('seen')
    expect(marks['alarm-1202']).toBe('seen')
    expect(marks['escape-tower']).toBe('missed')
    expect(Object.keys(marks)).toHaveLength(8)
  })

  it('keeps played and seen through a save and load', () => {
    const raw = serializeSaved({ settings: DEFAULT_SETTINGS, unlockedActs: ['act0-pad'], played: true, seen: ['hornet'] })
    expect(parseSaved(raw).seen).toEqual(['hornet'])
    expect(parseSaved(serializeSaved({ settings: DEFAULT_SETTINGS, unlockedActs: ['act0-pad'] })).played).toBeUndefined()
  })
})

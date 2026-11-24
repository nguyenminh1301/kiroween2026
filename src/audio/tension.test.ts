import { describe, expect, it } from 'vitest'
import { TENSION_LEVELS, tensionLevels } from './tension'

describe('tension layers', () => {
  it('matches the table', () => {
    expect(TENSION_LEVELS).toEqual({
      CALM: { drone: 0, pulse: 0, whine: 0 },
      UNEASE: { drone: 0.35, pulse: 0, whine: 0 },
      STALK: { drone: 0.8, pulse: 0, whine: 0.15 },
      CHASE: { drone: 0.5, pulse: 1, whine: 0.7 },
      RELEASE: { drone: 0.4, pulse: 0, whine: 0.1 },
    })
  })
  it('falls back to CALM for an unknown state', () => {
    expect(tensionLevels('NOPE' as never)).toEqual(TENSION_LEVELS.CALM)
  })
})

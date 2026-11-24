import { describe, expect, it } from 'vitest'
import { nameLine, revealCount } from './dialogue'

describe('typewriter', () => {
  it('reveals 45 characters a second and stops at the total', () => {
    expect(revealCount(0, 100)).toBe(0)
    expect(revealCount(1, 100)).toBe(45)
    expect(revealCount(0.5, 100)).toBe(22)
    expect(revealCount(10, 100)).toBe(100)
    expect(revealCount(-1, 100)).toBe(0)
  })
})

describe('name line', () => {
  it('tags radio and mood, and has none for the narrator', () => {
    expect(nameLine('NARRATOR', null)).toBeNull()
    expect(nameLine('CAPCOM', null)).toEqual({ name: 'HOUSTON', tags: ['(radio)'] })
    expect(nameLine('CMP', 'whisper')?.tags).toEqual(['(whispering)'])
    expect(nameLine('CDR', 'distant')?.tags).toEqual(['(far away)'])
  })
})

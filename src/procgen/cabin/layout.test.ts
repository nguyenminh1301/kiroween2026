import { describe, expect, it } from 'vitest'
import { EYE, HELMET_BODY_POS, HELMET_EYE, SEAT_Y } from './layout'

describe('cabin eye height', () => {
  it('puts the seated eye at helmet height, above the old belly-height eye', () => {
    expect(HELMET_EYE.y - SEAT_Y).toBeCloseTo(0.9, 5)
    expect(HELMET_EYE.y).toBeGreaterThan(EYE.y + 0.15)
    expect(HELMET_BODY_POS.y + 1.65).toBeCloseTo(HELMET_EYE.y, 5)
  })
})

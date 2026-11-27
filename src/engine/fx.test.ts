import { describe, expect, it } from 'vitest'
import { fxStore } from './fx'

describe('fx slit', () => {
  it('turns on and is cleared by clearFx', () => {
    fxStore.getState().setSlit(true)
    expect(fxStore.getState().slit).toBe(true)
    fxStore.getState().clearFx()
    expect(fxStore.getState().slit).toBe(false)
  })
})

describe('fx bite', () => {
  it('holds the teeth state, clamped, and clears', () => {
    fxStore.getState().setBite({ close: 2, flash: -1 })
    expect(fxStore.getState().bite).toEqual({ close: 1, flash: 0 })
    fxStore.getState().clearFx()
    expect(fxStore.getState().bite).toBeNull()
  })
})

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

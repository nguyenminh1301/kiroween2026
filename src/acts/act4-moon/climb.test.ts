import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DOWN_SECONDS, UP_SECONDS, climbDownAt, climbUpAt } from './climb'
import { CABIN_EYE, EVA_START, PAD_TOP } from './layout'

const near = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol

describe('climb down', () => {
  it('starts in the cabin and ends standing on the dust at the step-off point', () => {
    expect(climbDownAt(0).eye).toEqual(CABIN_EYE)
    const end = climbDownAt(DOWN_SECONDS)
    expect(near(end.eye.x, EVA_START.x) && near(end.eye.z, EVA_START.z)).toBe(true)
    expect(near(end.eye.y, 1.65, 0.02)).toBe(true)
    expect(end.done).toBe(true)
    expect(climbDownAt(DOWN_SECONDS - 0.2).done).toBe(false)
  })

  it('touches nine rungs, then drops about a metre onto the footpad', () => {
    expect(climbDownAt(5.99).clangs).toBe(9)
    expect(climbDownAt(2.5).clangs).toBe(0)
    const pad = climbDownAt(7.2)
    expect(pad.stage === 'drop' || pad.stage === 'step').toBe(true)
    expect(pad.eye.y).toBeGreaterThan(PAD_TOP + 1.4)
    expect(climbDownAt(6.3).hands).toBe(false)
  })

  it('moves smoothly: no jump bigger than 0.45 m between frames 1/30 s apart', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: DOWN_SECONDS - 1 / 30, noNaN: true }), (t) => {
        const a = climbDownAt(t).eye
        const b = climbDownAt(t + 1 / 30).eye
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.45)
      }),
    )
  })

  it('drops with the Moon pull: about one second for a metre', () => {
    const a = climbDownAt(6.0).eye.y
    const b = climbDownAt(7.0).eye.y
    expect(a - b).toBeGreaterThan(0.6)
    expect(a - b).toBeLessThan(1.1)
  })
})

describe('climb up', () => {
  it('takes 5 s, ends inside the cabin and touches nine rungs', () => {
    const end = climbUpAt(UP_SECONDS)
    expect(end.done).toBe(true)
    expect(end.eye).toEqual(CABIN_EYE)
    expect(climbUpAt(3.2).clangs).toBe(9)
    expect(climbUpAt(0).eye).toEqual({ x: EVA_START.x, y: 1.65, z: EVA_START.z })
  })

  it('moves smoothly', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: UP_SECONDS - 1 / 30, noNaN: true }), (t) => {
        const a = climbUpAt(t).eye
        const b = climbUpAt(t + 1 / 30).eye
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.45)
      }),
    )
  })
})

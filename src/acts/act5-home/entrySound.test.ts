import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { entryGlow } from './entryFx'
import { entrySoundAt } from './entrySound'

describe('re-entry sound', () => {
  it('is silent before the glow starts and after it is gone', () => {
    for (const t of [0, 2, 3.9, 18, 25, 60]) {
      const s = entrySoundAt(t, t < 5)
      expect(s.rumble + s.roar + s.crackle + s.rattle).toBe(0)
    }
  })

  it('follows the glow curve: rumble and roar order the same way as the glow', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 20, noNaN: true }), fc.double({ min: 0, max: 20, noNaN: true }), (a, b) => {
        const ga = entryGlow(a)
        const gb = entryGlow(b)
        const sa = entrySoundAt(a, false)
        const sb = entrySoundAt(b, false)
        if (ga <= gb) {
          expect(sa.rumble).toBeLessThanOrEqual(sb.rumble + 1e-12)
          expect(sa.roar).toBeLessThanOrEqual(sb.roar + 1e-12)
          expect(sa.crackle).toBeLessThanOrEqual(sb.crackle + 1e-12)
        }
      }),
    )
  })

  it('builds to the peak at 8 to 9 s, where the crackle is full, then fades', () => {
    expect(entrySoundAt(6, false).rumble).toBeLessThan(entrySoundAt(8.5, false).rumble)
    expect(entrySoundAt(8.5, false).crackle).toBe(1)
    expect(entrySoundAt(5, false).crackle).toBe(0)
    expect(entrySoundAt(11.5, false).rumble).toBeLessThan(entrySoundAt(9, false).rumble)
    expect(entrySoundAt(15, true).rumble).toBeLessThan(entrySoundAt(12.5, true).rumble)
  })

  it('is muffled and rattles in the cabin only', () => {
    const out = entrySoundAt(7, false)
    const cab = entrySoundAt(7, true)
    expect(out.muffle).toBe(0)
    expect(out.rattle).toBe(0)
    expect(cab.muffle).toBe(1)
    expect(cab.rattle).toBeGreaterThan(0)
    expect(cab.rumble).toBe(out.rumble)
  })
})

import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TEXTURE_NAMES, drawTexture } from './index'

describe('procedural textures', () => {
  it('has eleven names', () => {
    expect(TEXTURE_NAMES.length).toBe(11)
  })

  // Feature: render, Property 34: Texture determinism and dimension invariants
  it('is deterministic, 128 px, opaque, not flat and sized right', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TEXTURE_NAMES), fc.integer(), (name, seed) => {
        const a = drawTexture(name, seed)
        const b = drawTexture(name, seed)
        expect(a.width).toBe(128)
        expect(a.height).toBe(128)
        expect(a.data.length).toBe(a.width * a.height * 4)
        expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true)
        const colours = new Set<number>()
        for (let i = 0; i < a.data.length; i += 4) {
          expect(a.data[i + 3]).toBe(255)
          colours.add((a.data[i] << 16) | (a.data[i + 1] << 8) | a.data[i + 2])
        }
        expect(colours.size).toBeGreaterThanOrEqual(8)
      }),
      { numRuns: 100 },
    )
  })

  it('different seeds give different pixels', () => {
    for (const name of TEXTURE_NAMES) {
      const a = drawTexture(name, 1)
      const b = drawTexture(name, 2)
      expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false)
    }
  })

  it('tiles without a visible seam', () => {
    const lum = (d: Uint8ClampedArray, x: number, y: number) => {
      const i = (y * 128 + x) * 4
      return d[i] + d[i + 1] + d[i + 2]
    }
    for (const name of TEXTURE_NAMES) {
      const { data } = drawTexture(name, 7)
      let seam = 0
      let inner = 0
      let innerN = 0
      for (let k = 0; k < 128; k++) {
        seam += Math.abs(lum(data, k, 127) - lum(data, k, 0))
        seam += Math.abs(lum(data, 127, k) - lum(data, 0, k))
      }
      seam /= 256
      for (let y = 0; y < 127; y++) {
        for (let x = 0; x < 127; x++) {
          inner += Math.abs(lum(data, x, y) - lum(data, x, y + 1))
          inner += Math.abs(lum(data, x, y) - lum(data, x + 1, y))
          innerN += 2
        }
      }
      inner /= innerN
      expect(seam).toBeLessThanOrEqual(inner * 2)
    }
  })

  it('throws a descriptive error for unknown names', () => {
    expect(() => drawTexture('nope', 0)).toThrow(/Unknown texture name "nope"/)
  })

  it('six textures fit well under 2 MB', () => {
    const total = TEXTURE_NAMES.reduce((n, name) => n + drawTexture(name, 0).data.length, 0)
    expect(total).toBeLessThan(2 * 1024 * 1024)
  })
})

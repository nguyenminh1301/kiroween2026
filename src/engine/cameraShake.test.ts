import { describe, expect, it } from 'vitest'
import { shakeMagnitude } from './cameraShake'

describe('shakeMagnitude', () => {
  it('is 0 for no sample and for a still sample', () => {
    expect(shakeMagnitude(null)).toBe(0)
    expect(shakeMagnitude({ rx: 0, ry: 0, rz: 0, ox: 0, oy: 0, oz: 0 })).toBe(0)
  })
  it('takes the larger of offset and rotation length', () => {
    expect(shakeMagnitude({ rx: 0, ry: 0, rz: 0, ox: 3, oy: 4, oz: 0 })).toBe(5)
    expect(shakeMagnitude({ rx: 0.6, ry: 0.8, rz: 0, ox: 0.1, oy: 0, oz: 0 })).toBeCloseTo(1)
  })
})

import { describe, expect, it } from 'vitest'
import { createSightingTracker, type Sighting } from './sighting'

const eye = { x: 0, y: 0, z: 0 }
const ahead = { x: 0, y: 0, z: -1 }
const s: Sighting = { id: 'a', position: { x: 0, y: 0, z: -5 }, radius: 0.1, maxDistance: 10 }

describe('sighting tracker', () => {
  it('adds up time over separate glances', () => {
    const t = createSightingTracker()
    t.add(s)
    expect(t.update(0.25, eye, ahead)).toEqual([])
    expect(t.update(0.5, eye, { x: 0, y: 0, z: 1 })).toEqual([])
    expect(t.update(0.25, eye, ahead)).toEqual([])
    expect(t.update(0.2, eye, ahead)).toEqual(['a'])
  })

  it('counts nothing outside the cone or the range', () => {
    const t = createSightingTracker()
    t.add(s)
    // 40 degrees off axis
    const off = { x: Math.sin(0.7), y: 0, z: -Math.cos(0.7) }
    expect(t.update(5, eye, off)).toEqual([])
    expect(t.update(5, { x: 0, y: 0, z: 20 }, ahead)).toEqual([])
  })

  it('never reports an id twice, even if added twice', () => {
    const t = createSightingTracker()
    t.add(s)
    t.add({ ...s })
    expect(t.update(1, eye, ahead)).toEqual(['a'])
    expect(t.update(1, eye, ahead)).toEqual([])
  })

  it('can be sighted again after the act is registered anew', () => {
    const t = createSightingTracker()
    t.add(s)
    expect(t.update(1, eye, ahead)).toEqual(['a'])
    t.add(s)
    expect(t.update(1, eye, ahead)).toEqual(['a'])
  })
})

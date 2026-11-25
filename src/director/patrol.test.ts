import { describe, expect, it } from 'vitest'
import { inRoom, nearestS, PATROL_LENGTH, pointAt, route } from './patrol'

describe('patrol path', () => {
  it('has the loop corners and a length of 30', () => {
    expect(PATROL_LENGTH).toBeCloseTo(30)
    expect(pointAt(0)).toMatchObject({ x: 0, z: -28.25 })
    expect(pointAt(12)).toMatchObject({ x: 0, z: -16.25 })
    expect(pointAt(15)).toMatchObject({ x: 3, z: -16.25 })
    expect(pointAt(27).z).toBeCloseTo(-28.25)
    expect(pointAt(27).x).toBeCloseTo(3)
  })
  it('wraps around in both directions', () => {
    expect(pointAt(30 + 6).z).toBeCloseTo(pointAt(6).z)
    expect(pointAt(-3).x).toBeCloseTo(pointAt(27).x)
    expect(pointAt(6)).toMatchObject({ x: 0, z: -22.25 })
  })
  it('finds the nearest loop distance', () => {
    expect(nearestS({ x: 0, z: -22.25 })).toBeCloseTo(6, 0)
  })
  it('routes through a doorway between corridor and room', () => {
    const r = route({ x: 0, z: -17 }, { x: 3, z: -20 })
    expect(r.length).toBe(3)
    expect(r[0].z).toBe(-16.25)
    expect(inRoom(r[2])).toBe(true)
    expect(route({ x: 0, z: -3 }, { x: 0, z: -9 })).toEqual([{ x: 0, z: -9 }])
  })
})

import { describe, expect, it } from 'vitest'
import { resolveCapsule } from '../../engine/collision'
import { CAPSULE } from '../../engine/playerBody'
import { isHandrailUsable } from '../../interaction/handrail'
import { DEFAULT_REACH, nearestOnSegment } from '../../interaction/targeting'
import type { Vec3 } from '../../types'
import { bagPos, CM_LENGTH, cmFarFor, collisionBoxes, LANDER_Z0, rails } from './layout'

interface Sample {
  eye: Vec3
  /** Ids of the rails within reach of the eye. */
  usable: string[]
}

/** Every position a floating player can stand at: free of the collision boxes, feet 0 to 0.6 m (the ceiling stops the head). */
function reachable(cmFar: number): Sample[] {
  const boxes = collisionBoxes(cmFar)
  const bars = rails(cmFar)
  const out: Sample[] = []
  const zMin = LANDER_Z0 + 0.2
  const zMax = cmFar + CM_LENGTH + 0.2
  for (let x = -1.1; x <= 1.1001; x += 0.1) {
    for (let y = 0; y <= 0.6001; y += 0.1) {
      for (let z = zMin; z <= zMax; z += 0.1) {
        const pos = { x, y, z }
        const r = resolveCapsule(pos, { x: 0, y: 0, z: 0 }, boxes)
        if (r.pos.x !== x || r.pos.y !== y || r.pos.z !== z) continue
        const eye = { x, y: y + CAPSULE.eyeHeight, z }
        const usable = bars.filter((b) => isHandrailUsable(eye, nearestOnSegment(eye, b.a, b.b))).map((b) => b.id)
        out.push({ eye, usable })
      }
    }
  }
  return out
}

/** Union-find over rail ids: two rails are linked when one reachable position has both in reach. */
function chains(samples: Sample[]): (id: string) => string {
  const parent = new Map<string, string>()
  const find = (a: string): string => {
    let r = parent.get(a) ?? a
    while ((parent.get(r) ?? r) !== r) r = parent.get(r) ?? r
    parent.set(a, r)
    return r
  }
  for (const s of samples) for (const id of s.usable) if (!parent.has(id)) parent.set(id, id)
  for (const s of samples) for (const id of s.usable.slice(1)) parent.set(find(id), find(s.usable[0]))
  return find
}

describe.each([cmFarFor(false), cmFarFor(true)])('act 2 handrails, command module end at z = %s', (cmFar) => {
  const samples = reachable(cmFar)
  const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  const bag = bagPos(cmFar)
  const nearBag = samples.filter((s) => dist(s.eye, bag) <= DEFAULT_REACH)
  const find = chains(samples)

  it('has a rail in reach from every place the player can reach', () => {
    expect(samples.length).toBeGreaterThan(1000)
    const bare = samples.filter((s) => s.usable.length === 0).map((s) => `${s.eye.x.toFixed(1)},${s.eye.y.toFixed(2)},${s.eye.z.toFixed(1)}`)
    expect(bare).toEqual([])
  })

  it('has places by the bags to start the sleep from', () => {
    expect(nearBag.length).toBeGreaterThan(20)
  })

  it('links the farthest point of the lander to the bags by an unbroken chain of rails', () => {
    const far = samples.reduce((a, b) => (b.eye.z < a.eye.z ? b : a))
    expect(far.eye.z).toBeLessThan(LANDER_Z0 + 0.5)
    expect(far.usable.length).toBeGreaterThan(0)
    const bagChains = new Set(nearBag.flatMap((s) => s.usable.map(find)))
    expect(far.usable.some((id) => bagChains.has(find(id)))).toBe(true)
  })

  it('links the farthest point of the command module to the bags by an unbroken chain of rails', () => {
    const far = samples.reduce((a, b) => (b.eye.z > a.eye.z ? b : a))
    expect(far.eye.z).toBeGreaterThan(cmFar + CM_LENGTH - 0.5)
    expect(far.usable.length).toBeGreaterThan(0)
    const bagChains = new Set(nearBag.flatMap((s) => s.usable.map(find)))
    expect(far.usable.some((id) => bagChains.has(find(id)))).toBe(true)
  })

  it('links every reachable place to the bags', () => {
    const bagChains = new Set(nearBag.flatMap((s) => s.usable.map(find)))
    const lost = samples.filter((s) => !s.usable.some((id) => bagChains.has(find(id))))
    expect(lost.length).toBe(0)
  })
})

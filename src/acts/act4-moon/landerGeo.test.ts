import { Box3, Color } from 'three'
import { describe, expect, it } from 'vitest'
import { FLAG_BLUE, FLAG_CLOTH, FLAG_RED, FLAG_WHITE, FLAG_POLE_HEIGHT, buildAscent, buildDescentBody, buildFlag, buildLegs } from './landerGeo'
import { BELL_EXIT_RADIUS, BELL_EXIT_Y, FOOTPAD_DIST, STAGE_TOP } from './layout'

describe('flag', () => {
  const g = buildFlag()
  g.computeBoundingBox()
  const box = g.boundingBox as Box3

  it('is about 1 m wide and 2 m tall, not a big panel', () => {
    expect(box.max.x - box.min.x).toBeGreaterThan(0.9)
    expect(box.max.x - box.min.x).toBeLessThan(1.1)
    expect(box.max.y).toBeCloseTo(FLAG_POLE_HEIGHT + 0.015, 2)
  })

  it('hangs the cloth from the top bar, below it', () => {
    expect(FLAG_CLOTH.h).toBeLessThan(FLAG_POLE_HEIGHT / 2)
    const blue = new Color(FLAG_BLUE)
    const col = g.attributes.color
    const pos = g.attributes.position
    let blueTop = -Infinity
    let blueBottom = Infinity
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(col.getX(i) - blue.r) < 0.01 && Math.abs(col.getY(i) - blue.g) < 0.01 && Math.abs(col.getZ(i) - blue.b) < 0.01) {
        blueTop = Math.max(blueTop, pos.getY(i))
        blueBottom = Math.min(blueBottom, pos.getY(i))
      }
    }
    expect(blueTop).toBeLessThan(FLAG_POLE_HEIGHT)
    expect(blueTop - blueBottom).toBeCloseTo((FLAG_CLOTH.h / 13) * 7, 1)
  })
})

describe('flag stripes and stars', () => {
  const count = (hex: string): number => {
    const g = buildFlag()
    const c = new Color(hex)
    const col = g.attributes.color
    let n = 0
    for (let i = 0; i < col.count; i++) if (Math.abs(col.getX(i) - c.r) < 0.01 && Math.abs(col.getY(i) - c.g) < 0.01 && Math.abs(col.getZ(i) - c.b) < 0.01) n++
    return n
  }
  it('has seven red stripes, six white stripes plus stars on a blue canton', () => {
    const perBox = 36
    expect(count(FLAG_RED) / perBox).toBe(7)
    // Six white stripes and 23 star boxes.
    expect(count(FLAG_WHITE) / perBox).toBe(6 + 23)
  })
  it('keeps the horizontal rod along the top edge', () => {
    const g = buildFlag()
    g.computeBoundingBox()
    expect(g.boundingBox!.max.y).toBeCloseTo(FLAG_POLE_HEIGHT + 0.015, 2)
  })
})

describe('lander engines and feet', () => {
  it('shows a descent bell 1.5 m wide at the exit, centred under the stage', () => {
    const pos = buildDescentBody().attributes.position
    let lowest = Infinity
    let widest = 0
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < lowest) lowest = pos.getY(i)
      if (pos.getY(i) < BELL_EXIT_Y + 0.001) widest = Math.max(widest, Math.hypot(pos.getX(i), pos.getZ(i)))
    }
    expect(lowest).toBeLessThan(BELL_EXIT_Y + 0.05)
    expect(widest * 2).toBeGreaterThan(BELL_EXIT_RADIUS * 2 - 0.01)
    expect(widest * 2).toBeLessThan(1.65)
  })

  it('closes the bottom of the ascent stage and hangs its own bell under it', () => {
    const g = buildAscent()
    const pos = g.attributes.position
    let belowBase = 0
    let capTriangles = 0
    for (let i = 0; i < pos.count; i += 3) {
      const ys = [0, 1, 2].map((k) => pos.getY(i + k))
      if (ys.every((y) => Math.abs(y - STAGE_TOP) < 1e-6)) capTriangles++
      if (ys.some((y) => y < STAGE_TOP - 0.1)) belowBase++
    }
    expect(capTriangles).toBeGreaterThanOrEqual(6)
    expect(belowBase).toBeGreaterThan(0)
  })

  it('has round dish pads and probes under three of them, none by the ladder leg', () => {
    const pos = buildLegs().attributes.position
    const probeTips = new Set<string>()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      if (pos.getY(i) < 0.045 && Math.hypot(x, z) > FOOTPAD_DIST + 1.2) probeTips.add(`${Math.sign(Math.round(x))},${Math.sign(Math.round(z))}`)
    }
    expect([...probeTips].sort()).toEqual(['-1,0', '0,-1', '1,0'])
  })
})

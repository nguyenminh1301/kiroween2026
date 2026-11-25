import { Box3, Color } from 'three'
import { describe, expect, it } from 'vitest'
import { FLAG_CLOTH, FLAG_POLE_HEIGHT, buildFlag } from './landerGeo'

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
    const blue = new Color('#2F5F8F')
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
    expect(blueTop - blueBottom).toBeCloseTo(FLAG_CLOTH.h, 1)
  })
})

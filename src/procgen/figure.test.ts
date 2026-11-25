import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { headOf } from './anchors'
import { buildFigure } from './figure'

describe('figure builder', () => {
  it('stays under 800 triangles in every option set', () => {
    for (const helmet of [true, false]) {
      for (const suit of ['pressure', 'coverall'] as const) {
        const f = buildFigure({ helmet, suit })
        expect(f.triangles).toBeGreaterThan(100)
        expect(f.triangles).toBeLessThan(800)
        f.dispose()
      }
    }
  })

  it('puts the head anchor at about 1.7 m and registers it by name', () => {
    const f = buildFigure({ name: 'test-fig' })
    f.root.updateMatrixWorld(true)
    const p = new Vector3()
    f.head.getWorldPosition(p)
    expect(p.y).toBeGreaterThan(1.6)
    expect(p.y).toBeLessThan(1.8)
    expect(headOf('test-fig')().y).toBeCloseTo(p.y, 3)
    f.dispose()
  })
})

describe('sleeping pose', () => {
  it('tips the head forward and lets the arms drift', async () => {
    const { poseFor } = await import('./figurePose')
    const p = poseFor('sleeping', 0)
    expect(p.bones.neck[0]).toBeGreaterThan(0.4)
    expect(p.bones.shoulderL[0]).toBeLessThan(-0.2)
    expect(p.bones.elbowL[0]).toBeLessThan(-0.3)
  })
})

import { Box3, MeshBasicMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { buildAstronaut, poseAstronaut } from '../../procgen/astronaut'
import { CEILING_GAP, CREATURE_SCALE } from './creatureFit'
import { HEIGHT } from './layout'

/** The highest point of the posed creature, in metres above the floor, scaled as drawn. */
function topOver(anim: 'walk' | 'freeze', steps: number): number {
  const a = buildAstronaut(new MeshBasicMaterial(), new MeshBasicMaterial())
  a.root.scale.setScalar(CREATURE_SCALE)
  let top = 0
  for (let k = 0; k < steps; k++) {
    // A full gait cycle is one turn of the phase, in held poses, with the head tilting as time goes.
    poseAstronaut(a, anim, k * 0.37, (k / steps) * Math.PI * 2 * 4)
    a.root.updateMatrixWorld(true)
    top = Math.max(top, new Box3().setFromObject(a.root).max.y)
  }
  return top
}

describe('creature size against the corridor', () => {
  it(`keeps its top at least ${CEILING_GAP} m under the ${HEIGHT} m ceiling at every point of the walk cycle`, () => {
    expect(topOver('walk', 96)).toBeLessThanOrEqual(HEIGHT - CEILING_GAP)
  })
  it('keeps its top under the ceiling when it stands still and tilts its head', () => {
    expect(topOver('freeze', 96)).toBeLessThanOrEqual(HEIGHT - CEILING_GAP)
  })
  it('is stooped forward, not shrunk to nothing', () => {
    const a = buildAstronaut(new MeshBasicMaterial(), new MeshBasicMaterial())
    poseAstronaut(a, 'walk', 0, 1)
    expect(a.spine.rotation.x).toBeGreaterThan(0.3)
    expect(CREATURE_SCALE).toBeGreaterThan(0.75)
  })
})

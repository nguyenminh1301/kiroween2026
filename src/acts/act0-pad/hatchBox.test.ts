import { describe, expect, it } from 'vitest'
import type { Box } from '../../engine/collision'
import { BOX_BACK_Z, BOX_FRONT_Z, BOX_H, BOX_W, hatchBoxParts, hatchCouches, SKIN_Z } from './hatchBox'
import { HATCH_POS, ROOM_HALF, WALK_Z_END } from './room'

/** Does the ray hit the box before `tMax`? Slab method. */
function hits(o: [number, number, number], d: [number, number, number], bx: Box, tMax: number): boolean {
  let t0 = 0
  let t1 = tMax
  const lo = [bx.min.x, bx.min.y, bx.min.z]
  const hi = [bx.max.x, bx.max.y, bx.max.z]
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return false
    } else {
      const a = (lo[i] - o[i]) / d[i]
      const c = (hi[i] - o[i]) / d[i]
      t0 = Math.max(t0, Math.min(a, c))
      t1 = Math.min(t1, Math.max(a, c))
      if (t0 > t1) return false
    }
  }
  return true
}

describe('hatch cabin box', () => {
  const parts = hatchBoxParts()

  it('stands in front of the skin and inside the hatch leaf outline', () => {
    expect(BOX_BACK_Z).toBeGreaterThan(SKIN_Z)
    expect(BOX_FRONT_Z).toBeLessThan(SKIN_Z + 0.15)
    expect(BOX_W + 0.08).toBeLessThan(0.98)
    expect(BOX_H + 0.08).toBeLessThan(1.04)
  })

  it('is solid: any line of sight through the mouth from the standing area ends on a wall', () => {
    const mouthZ = BOX_FRONT_Z
    let n = 0
    for (let ex = -ROOM_HALF + 0.3; ex <= ROOM_HALF - 0.3; ex += 0.25) {
      for (const ey of [0.9, 1.65]) {
        for (let ez = WALK_Z_END - 0.3; ez >= -8.6; ez -= 0.4) {
          const eye: [number, number, number] = [ex, ey, ez]
          for (let u = 0; u <= 1; u += 0.125) {
            for (let v = 0; v <= 1; v += 0.125) {
              const px = HATCH_POS.x + (u - 0.5) * BOX_W
              const py = HATCH_POS.y + (v - 0.5) * BOX_H
              const d: [number, number, number] = [px - eye[0], py - eye[1], mouthZ - eye[2]]
              const len = Math.hypot(...d)
              const dir: [number, number, number] = [d[0] / len, d[1] / len, d[2] / len]
              // From the mouth on to 3 m past it: some part must be hit.
              const start: [number, number, number] = [px, py, mouthZ]
              expect(parts.some((p) => hits(start, dir, p, 3)), `eye ${eye} mouth ${u},${v}`).toBe(true)
              n++
            }
          }
        }
      }
    }
    expect(n).toBeGreaterThan(1000)
  })

  it('has faint couch shapes lying on the back plate', () => {
    expect(hatchCouches().length).toBeGreaterThan(0)
    hatchCouches().forEach((c) => expect(c.min.z).toBeGreaterThanOrEqual(BOX_BACK_Z))
  })
})

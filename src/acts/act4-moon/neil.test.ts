import { describe, expect, it } from 'vitest'
import { STAGE_HALF } from './layout'
import { NEIL_DOWN_SECONDS, NEIL_FOOT, NEIL_PHOTO, WORK_STOPS, createNeil, headingTo, neilClimbAt, photoStop, placeNeil, sendNeil, stepNeil } from './neil'

const run = (n: ReturnType<typeof createNeil>, secs: number, each?: () => void): void => {
  for (let t = 0; t < secs; t += 0.05) {
    stepNeil(n, 0.05)
    each?.()
  }
}

describe('Neil on the ladder', () => {
  it('starts at the hatch, ends at the foot and never goes under the ground', () => {
    const a = neilClimbAt(0)
    expect(a.y).toBeCloseTo(3, 1)
    const b = neilClimbAt(NEIL_DOWN_SECONDS)
    expect(b.x).toBeCloseTo(NEIL_FOOT.x, 1)
    expect(b.z).toBeCloseTo(NEIL_FOOT.z, 1)
    let prev = Infinity
    for (let t = 0.9; t < 3.5; t += 0.1) {
      const f = neilClimbAt(t)
      expect(f.y).toBeLessThanOrEqual(prev + 1e-9)
      prev = f.y
      expect(f.y).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('Neil at work', () => {
  it('walks to each stop, faces the way he walks and works there', () => {
    const n = createNeil()
    placeNeil(n, NEIL_FOOT.x, NEIL_FOOT.z, 'standing')
    sendNeil(n, WORK_STOPS, true)
    const seen = new Set<string>()
    run(n, 80, () => {
      seen.add(n.anim)
      if (n.anim === 'walk' && n.next >= 0) {
        const s = n.route[n.next]
        const want = headingTo(n.x, n.z, s.x, s.z)
        if (Math.hypot(s.x - n.x, s.z - n.z) > 0.3) expect(Math.cos(n.yaw - want)).toBeGreaterThan(0.99)
      }
    })
    for (const a of ['walk', 'scoop', 'kneel', 'write', 'camera']) expect(seen.has(a)).toBe(true)
  })

  it('keeps the walking loop clear of the descent stage', () => {
    const n = createNeil()
    placeNeil(n, NEIL_FOOT.x, NEIL_FOOT.z, 'standing')
    sendNeil(n, WORK_STOPS, true)
    run(n, 120, () => {
      expect(Math.max(Math.abs(n.x), Math.abs(n.z))).toBeGreaterThan(STAGE_HALF + 0.8)
    })
  })

  it('turns to face Buzz and lifts the camera at the photo stop', () => {
    const n = createNeil()
    placeNeil(n, NEIL_FOOT.x, NEIL_FOOT.z, 'standing')
    sendNeil(n, [photoStop()])
    run(n, 12)
    expect(n.x).toBeCloseTo(NEIL_PHOTO.x, 1)
    expect(n.anim).toBe('camera')
    expect(n.amount).toBe(1)
    // He faces back toward the lander side (-z), where Buzz stands.
    expect(Math.cos(n.yaw - Math.PI)).toBeGreaterThan(0.9)
  })
})

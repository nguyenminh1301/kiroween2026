// The 6-second sandbox test Timeline: two Shots, one shake ramp, one event.
// No Three.js or React imports.
import type { CameraPose, TimelineDef } from '../../timeline/timeline'
import type { Vec3 } from '../../types'

export const TEST_TIMELINE_DURATION = 6

const lerp = (a: Vec3, b: Vec3, u: number): Vec3 => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
  z: a.z + (b.z - a.z) * u,
})

const pose = (from: Vec3, to: Vec3, look: Vec3, u: number): CameraPose => ({
  position: lerp(from, to, u),
  lookAt: look,
})

/** `onEvent` runs once at 4.5 s. */
export function createTestTimelineDef(onEvent: () => void): TimelineDef {
  return {
    duration: TEST_TIMELINE_DURATION,
    shots: [
      {
        from: 0,
        to: 3,
        fov: 50,
        cam: (u) => pose({ x: -2, y: 2, z: 6 }, { x: 2, y: 2, z: 6 }, { x: 0, y: 1, z: 0 }, u),
      },
      {
        from: 3,
        to: 6,
        fov: 70,
        cam: (u) => pose({ x: 0, y: 3.5, z: 4 }, { x: 0, y: 3.5, z: -2 }, { x: 0, y: 0, z: -4 }, u),
      },
    ],
    shake: [
      { t: 0, amp: 0 },
      { t: 2, amp: 0.04 },
      { t: 4, amp: 0 },
    ],
    events: [{ at: 4.5, run: onEvent }],
  }
}

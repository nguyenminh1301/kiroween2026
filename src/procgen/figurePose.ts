// Pure pose math for the figure. No Three.js imports. A figure faces +z, so its right side is -x.
export type PoseKind = 'standing' | 'wave' | 'seated' | 'working' | 'resting' | 'sleeping' | 'hanging'

export type BoneName =
  | 'spine'
  | 'neck'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'

export type Rot = [number, number, number]

export interface PoseResult {
  /** Root offset up from the floor, and root rotation about x (lying down). */
  rootY: number
  rootRotX: number
  rootRotZ: number
  bones: Record<BoneName, Rot>
}

const ZERO: Rot = [0, 0, 0]

function blank(): PoseResult {
  const bones = {} as Record<BoneName, Rot>
  for (const k of [
    'spine', 'neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR',
  ] as BoneName[]) {
    bones[k] = [...ZERO]
  }
  return { rootY: 0, rootRotX: 0, rootRotZ: 0, bones }
}

/** Bone rotations for a pose at time `t` seconds. `amount` (0 to 1) scales the wave. */
export function poseFor(kind: PoseKind, t: number, amount = 1): PoseResult {
  const p = blank()
  const a = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0))
  const sway = Math.sin(t * 0.8)
  switch (kind) {
    case 'standing':
    case 'wave': {
      p.rootRotZ = sway * 0.015
      p.bones.spine = [Math.sin(t * 1.1) * 0.012, 0, 0]
      p.bones.shoulderL = [0, 0, 0.07 + sway * 0.01]
      p.bones.shoulderR = [0, 0, -0.07 - sway * 0.01]
      if (kind === 'wave') {
        // Right arm up, forearm swinging side to side.
        const swing = Math.sin(t * 9)
        p.bones.shoulderR = [0, 0, -0.07 - a * 2.55]
        p.bones.elbowR = [0, 0, -a * (0.15 + 0.55 * swing)]
        p.bones.neck = [0, 0, a * 0.05 * swing]
      }
      break
    }
    case 'working':
    case 'seated': {
      p.rootY = -0.4
      p.bones.spine = [-0.3, 0, 0]
      p.bones.hipL = [-Math.PI / 2, 0, 0.03]
      p.bones.hipR = [-Math.PI / 2, 0, -0.03]
      p.bones.kneeL = [Math.PI / 2, 0, 0]
      p.bones.kneeR = [Math.PI / 2, 0, 0]
      p.bones.shoulderL = [-0.9, 0, 0.1]
      p.bones.shoulderR = [-0.9, 0, -0.1]
      p.bones.elbowL = [-0.5, 0, 0]
      p.bones.elbowR = [-0.5, 0, 0]
      p.bones.neck = [0.3, 0, 0]
      if (kind === 'working') {
        // A 9 s loop: look at the panel, reach and tap it twice, look at the window, write on a card.
        const u = (t % 9) / 9
        const reach = Math.max(0, Math.sin(Math.PI * Math.min(1, u / 0.4)))
        const tap = u < 0.4 ? Math.max(0, Math.sin(u * 60)) * 0.08 : 0
        const write = u > 0.6 && u < 0.95 ? Math.sin(u * 140) * 0.05 : 0
        p.bones.shoulderR = [-0.9 - reach * 0.55 - tap, 0, -0.1]
        p.bones.elbowR = [-0.5 - reach * 0.4, 0, 0]
        p.bones.shoulderL = [-0.9 - (u > 0.6 && u < 0.95 ? 0.1 : 0) + write, 0, 0.1]
        p.bones.neck = [0.3, u > 0.45 && u < 0.6 ? 0.7 : u < 0.4 ? 0 : -0.15, 0]
      }
      break
    }
    case 'sleeping': {
      // Zipped into a bag in zero g: head tipped forward, arms loose and drifting.
      p.bones.spine = [0.12 + Math.sin(t * 0.9) * 0.01, 0, 0]
      p.bones.neck = [0.55 + Math.sin(t * 0.7) * 0.03, 0, 0]
      p.bones.shoulderL = [-0.45 + Math.sin(t * 0.8) * 0.12, 0, 0.35 + Math.sin(t * 0.6) * 0.1]
      p.bones.shoulderR = [-0.35 + Math.sin(t * 0.8 + 1.5) * 0.12, 0, -0.35 - Math.sin(t * 0.6 + 1) * 0.1]
      p.bones.elbowL = [-0.55 + Math.sin(t * 0.9) * 0.1, 0, 0]
      p.bones.elbowR = [-0.45 + Math.sin(t * 0.9 + 2) * 0.1, 0, 0]
      break
    }
    case 'hanging': {
      // Upside down by the ankles: the root is flipped about x, so an arm rotated by pi about x hangs toward the
      // floor. The arms dangle outward and swing a little, the head lolls, the body swings like a pendulum.
      p.rootRotX = Math.PI
      p.rootRotZ = Math.sin(t * 0.9) * 0.05
      p.bones.spine = [0.08 + Math.sin(t * 0.7) * 0.02, 0, 0]
      p.bones.neck = [0.35 + Math.sin(t * 0.6) * 0.06, Math.sin(t * 0.4) * 0.1, 0]
      p.bones.shoulderL = [Math.PI - 0.12 + Math.sin(t * 0.8) * 0.1, 0, 0.5 + Math.sin(t * 0.6) * 0.08]
      p.bones.shoulderR = [Math.PI - 0.2 + Math.sin(t * 0.8 + 1.4) * 0.1, 0, -0.5 - Math.sin(t * 0.6 + 1) * 0.08]
      p.bones.elbowL = [0.25 + Math.sin(t * 0.9) * 0.08, 0, 0]
      p.bones.elbowR = [0.35 + Math.sin(t * 0.9 + 2) * 0.08, 0, 0]
      p.bones.hipL = [0, 0, -0.04]
      p.bones.hipR = [0, 0, 0.04]
      break
    }
    case 'resting': {
      p.rootY = 0.22
      p.rootRotX = -Math.PI / 2
      p.bones.spine = [Math.sin(t * 0.9) * 0.01, 0, 0]
      p.bones.shoulderL = [-0.55, 0, -0.35]
      p.bones.shoulderR = [-0.55, 0, 0.35]
      p.bones.elbowL = [-1.3, 0, 0]
      p.bones.elbowR = [-1.3, 0, 0]
      break
    }
  }
  return p
}

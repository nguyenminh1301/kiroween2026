// Pure pose math for the figure. No Three.js imports. A figure faces +z, so its right side is -x.
export type PoseKind = 'standing' | 'wave' | 'seated' | 'resting'

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

import type { MoveMode, Vec3 } from '../types'

export const CAPSULE = { height: 1.8, radius: 0.3, eyeHeight: 1.65 } as const

export interface PlayerBody {
  /** Feet position. */
  pos: Vec3
  vel: Vec3
  yaw: number
  pitch: number
  mode: MoveMode
}

export function createBody(partial: Partial<PlayerBody> = {}): PlayerBody {
  return setBody(
    {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      mode: 'walk',
    },
    partial,
  )
}

export function eyePosition(body: PlayerBody): Vec3 {
  return { x: body.pos.x, y: body.pos.y + CAPSULE.eyeHeight, z: body.pos.z }
}

/**
 * Returns a new body with the given fields overwritten. When `pos` is given
 * without `vel`, `vel` is zeroed. Other fields carry over.
 */
export function setBody(body: PlayerBody, partial: Partial<PlayerBody>): PlayerBody {
  const next: PlayerBody = { ...body }
  if (partial.pos !== undefined) {
    next.pos = { ...partial.pos }
    if (partial.vel === undefined) next.vel = { x: 0, y: 0, z: 0 }
  }
  if (partial.vel !== undefined) next.vel = { ...partial.vel }
  if (partial.yaw !== undefined) next.yaw = partial.yaw
  if (partial.pitch !== undefined) next.pitch = partial.pitch
  if (partial.mode !== undefined) next.mode = partial.mode
  return next
}

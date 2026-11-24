// One frame of player movement for the current move mode. No React or Three.js imports.
// Yaw convention: yaw 0 faces -Z, positive yaw turns left (matches mouse look).
import { resolveCapsule, type Box } from './collision'
import { MOUSE_SCALE, type InputState } from './input'
import { stepSeated, stepWalk, stepZeroG, WALK_PITCH_LIMIT, EARTH_GRAVITY, type WalkConfig } from './movement'
import { setBody, type PlayerBody } from './playerBody'

export interface PlayerStepConfig {
  boxes: Box[]
  ground?: (x: number, z: number) => number
  gravity?: number
  speed?: number
  jump?: WalkConfig['jump']
  /** Yaw of the seat's forward direction, used while seated. */
  seatForwardYaw: number
}

export interface MouseDelta {
  x: number
  y: number
}

/** Applies mouse look, then steps the body for `body.mode` with collision against `cfg.boxes`. */
export function stepPlayer(
  body: PlayerBody,
  input: InputState,
  mouse: MouseDelta,
  sensitivity: number,
  dt: number,
  cfg: PlayerStepConfig,
): PlayerBody {
  const k = MOUSE_SCALE * sensitivity
  const dyaw = -mouse.x * k
  const dpitch = -mouse.y * k

  if (body.mode === 'seated') {
    return stepSeated(body, dyaw, dpitch, { seatForwardYaw: cfg.seatForwardYaw })
  }

  const pitch = Math.min(WALK_PITCH_LIMIT, Math.max(-WALK_PITCH_LIMIT, body.pitch + dpitch))
  const looked = setBody(body, { yaw: body.yaw + dyaw, pitch })

  if (body.mode === 'zeroG') {
    const moved = stepZeroG(looked, dt)
    const r = resolveCapsule(moved.pos, moved.vel, cfg.boxes)
    const pos = { ...r.pos }
    const vel = { ...r.vel }
    const floor = cfg.ground ? cfg.ground(pos.x, pos.z) : null
    if (floor !== null && pos.y < floor) {
      pos.y = floor
      if (vel.y < 0) vel.y = 0
    }
    return setBody(moved, { pos, vel })
  }

  const walkCfg: WalkConfig = {
    gravity: cfg.gravity ?? EARTH_GRAVITY,
    boxes: cfg.boxes,
  }
  if (cfg.speed !== undefined) walkCfg.speed = cfg.speed
  if (cfg.ground) walkCfg.ground = cfg.ground
  if (cfg.jump) walkCfg.jump = cfg.jump
  return stepWalk(looked, input, dt, walkCfg)
}

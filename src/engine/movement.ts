// Pure movement step functions. No Three.js or React imports.
// Yaw convention: yaw 0 faces -Z, positive yaw turns left (matches mouse look).

import type { Vec3 } from '../types'
import { resolveCapsule, type Box } from './collision'
import type { InputState } from './input'
import { setBody, type PlayerBody } from './playerBody'

export const DEFAULT_WALK_SPEED = 1.4
export const EARTH_GRAVITY = 9.81
export const MOON_GRAVITY = 1.62
export const MOON_JUMP_SPEED = 2.2
export const MOON_WALK_SPEED = 2.5

/** Act params for the Moon, ready to spread into a WalkConfig. */
export const MOON_WALK: Readonly<{ speed: number; gravity: number; jump: { takeoffSpeed: number } }> = {
  speed: MOON_WALK_SPEED,
  gravity: MOON_GRAVITY,
  jump: { takeoffSpeed: MOON_JUMP_SPEED },
}

export const WALK_PITCH_LIMIT = Math.PI / 2
export const SEATED_YAW_LIMIT = (100 * Math.PI) / 180
export const SEATED_PITCH_LIMIT = (80 * Math.PI) / 180

export const ZEROG_HALF_LIFE = 0.5
export const LAUNCH_DISTANCE = 1.5

/** Largest drop, in metres, that walking over a Ground_Function surface follows without leaving the ground. */
const GROUND_SNAP = 0.6
const GROUND_EPS = 1e-6

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const finiteOr = (v: number, fallback: number): number => (Number.isFinite(v) ? v : fallback)

export interface WalkConfig {
  speed?: number
  gravity: number
  ground?: (x: number, z: number) => number
  boxes?: Box[]
  jump?: { takeoffSpeed: number }
}

export function stepWalk(body: PlayerBody, input: InputState, dt: number, cfg: WalkConfig): PlayerBody {
  if (!(dt > 0)) return body

  const speed = cfg.speed ?? DEFAULT_WALK_SPEED
  const boxes = cfg.boxes ?? []
  const ground = cfg.ground
  const pitch = clamp(body.pitch, -WALK_PITCH_LIMIT, WALK_PITCH_LIMIT)

  // Was the player standing on something at the start of the step?
  const onGroundFn = ground ? body.pos.y - ground(body.pos.x, body.pos.z) <= GROUND_EPS : false
  const onBox = boxes.length > 0 && resolveCapsule(body.pos, body.vel, boxes).onGround
  const wasGrounded = body.vel.y <= 0 && (onGroundFn || onBox)

  // Horizontal velocity from input, clamped to `speed` on diagonals.
  const fwd = (input.held.forward ? 1 : 0) - (input.held.back ? 1 : 0)
  const strafe = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0)
  const sin = Math.sin(body.yaw)
  const cos = Math.cos(body.yaw)
  let dx = fwd * -sin + strafe * cos
  let dz = fwd * -cos + strafe * -sin
  const len = Math.hypot(dx, dz)
  if (len > 1) {
    dx /= len
    dz /= len
  }
  const vx = dx * speed
  const vz = dz * speed

  // Vertical: jump, gravity or resting.
  const jumping = !!cfg.jump && wasGrounded && input.pressed.holdBreath
  let vy = body.vel.y
  if (jumping) {
    vy = cfg.jump!.takeoffSpeed
  } else if (wasGrounded) {
    vy = 0
  } else {
    vy -= cfg.gravity * dt
  }

  const pos: Vec3 = {
    x: body.pos.x + vx * dt,
    y: body.pos.y + vy * dt,
    z: body.pos.z + vz * dt,
  }

  if (ground) {
    const floor = ground(pos.x, pos.z)
    if (wasGrounded && !jumping && pos.y - floor <= GROUND_SNAP) {
      // Follow the surface up or down a slope without bouncing.
      pos.y = floor
      vy = 0
    } else if (pos.y <= floor) {
      pos.y = floor
      if (vy < 0) vy = 0
    }
  }

  const vel: Vec3 = { x: vx, y: vy, z: vz }
  if (boxes.length > 0) {
    const r = resolveCapsule(pos, vel, boxes)
    return setBody({ ...body, pitch }, { pos: r.pos, vel: r.vel })
  }
  return setBody({ ...body, pitch }, { pos, vel })
}

export interface ZeroGConfig {
  decayHalfLifeSeconds?: number
}

export function stepZeroG(body: PlayerBody, dt: number, cfg: ZeroGConfig = {}): PlayerBody {
  if (!(dt > 0)) return body
  const half = cfg.decayHalfLifeSeconds ?? ZEROG_HALF_LIFE
  const f = Math.exp((-Math.LN2 / half) * dt)
  const vel: Vec3 = { x: body.vel.x * f, y: body.vel.y * f, z: body.vel.z * f }
  const pos: Vec3 = {
    x: body.pos.x + vel.x * dt,
    y: body.pos.y + vel.y * dt,
    z: body.pos.z + vel.z * dt,
  }
  return setBody(body, { pos, vel })
}

/** Adds a push of speed `1.5 * ln2 / halfLife` along `dir` (normalized). Zero or invalid `dir` is a no-op. */
export function launch(body: PlayerBody, dir: Vec3, cfg: ZeroGConfig = {}): PlayerBody {
  const len = Math.hypot(dir.x, dir.y, dir.z)
  if (!Number.isFinite(len) || len === 0) return body
  const half = cfg.decayHalfLifeSeconds ?? ZEROG_HALF_LIFE
  const s = (LAUNCH_DISTANCE * Math.LN2) / half / len
  return setBody(body, {
    vel: { x: body.vel.x + dir.x * s, y: body.vel.y + dir.y * s, z: body.vel.z + dir.z * s },
  })
}

export interface SeatedConfig {
  seatForwardYaw: number
}

/** Wraps an angle into (-PI, PI]. */
function wrapAngle(a: number): number {
  const twoPi = Math.PI * 2
  let r = a % twoPi
  if (r > Math.PI) r -= twoPi
  else if (r <= -Math.PI) r += twoPi
  return r
}

export function stepSeated(
  body: PlayerBody,
  yawInputDelta: number,
  pitchInputDelta: number,
  cfg: SeatedConfig,
): PlayerBody {
  const offset = wrapAngle(finiteOr(body.yaw, cfg.seatForwardYaw) + finiteOr(yawInputDelta, 0) - cfg.seatForwardYaw)
  const yaw = cfg.seatForwardYaw + clamp(offset, -SEATED_YAW_LIMIT, SEATED_YAW_LIMIT)
  const pitch = clamp(finiteOr(body.pitch, 0) + finiteOr(pitchInputDelta, 0), -SEATED_PITCH_LIMIT, SEATED_PITCH_LIMIT)
  return { ...body, pos: { ...body.pos }, vel: { x: 0, y: 0, z: 0 }, yaw, pitch }
}

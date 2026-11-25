// Fixed positions and collision for act 2. Pure data and functions: no Three.js or React imports.
// Z runs from the command module (+z) to the lander (-z).
import type { Box } from '../../engine/collision'
import type { Vec3 } from '../../types'

export const CM_FAR_START = 1.5
export const TUNNEL_GROWTH = 1.5
export const cmFarFor = (fixed: boolean): number => CM_FAR_START + (fixed ? TUNNEL_GROWTH : 0)

export const START_POS: Vec3 = { x: 0, y: 0.3, z: 3.5 }

export const LANDER_Z0 = -6.5
export const LANDER_Z1 = -3
export const ROOM_HALF_W = 1.4
export const ROOM_H = 2.4
export const CM_LENGTH = 3.5
/** The tunnel axis height. The eye range inside the tunnel is axis - 0.15 to axis + 0.3. */
export const TUNNEL_AXIS_Y = 1.8
export const TUNNEL_HALF = 0.45
export const TUNNEL_CEILING = TUNNEL_AXIS_Y + TUNNEL_HALF
/** Crossing into the lander happens past this z. */
export const LANDER_ENTRY_Z = -3.2

export const PEN_POS: Vec3 = { x: 0.6, y: 1.5, z: -4.2 }
export const PEN_RADIUS = 0.2
export const BREAKER_POS: Vec3 = { x: -1.05, y: 1.4, z: -5 }
export const BREAKER_RADIUS = 0.25
export const OUT_VIEW: Vec3 = { x: 0, y: 1.3, z: -4.5 }
export const TUNNEL_VIEW: Vec3 = { x: 0, y: 1.8, z: 2 }

export const RAIL_Y = 1.6
export const RAIL_RADIUS = 0.3
export const RAIL_STEP = 1.5

export const bagPos = (cmFar: number): Vec3 => ({ x: -1.25, y: 1.1, z: cmFar + 2.75 })
export const BAG_RADIUS = 0.5
export const cdrPos = (cmFar: number): Vec3 => ({ x: -1.12, y: 0.2, z: cmFar + 1.2 })
export const mikePos = (cmFar: number): Vec3 => ({ x: 1.12, y: 0.2, z: cmFar + 2.4 })
export const breathPos = (cmFar: number): Vec3 => ({ x: 0, y: 2, z: cmFar + 1.5 })
export const lightPos = (cmFar: number): Vec3 => ({ x: 0, y: 2.3, z: cmFar + CM_LENGTH / 2 })
/** Eye just above the bag top. The feet sit 1.65 m below. */
export const sleepEye = (cmFar: number): Vec3 => ({ x: -1.15, y: 1.75, z: cmFar + 2.75 })
export const SLEEP_YAW = -Math.PI / 2

export function inTunnel(z: number, cmFar: number): boolean {
  return z > LANDER_Z1 && z < cmFar
}

/** Rail z values, every 1.5 m from `cmFar` + 2.7 down to just inside the lander. */
export function railZs(cmFar: number): number[] {
  const out: number[] = []
  for (let z = cmFar + 2.7; z >= LANDER_Z1 - 0.4; z -= RAIL_STEP) out.push(Math.round(z * 1000) / 1000)
  return out
}

export interface RailSpec {
  id: string
  a: Vec3
  b: Vec3
}

/** Rail bars across the room. Inside the tunnel they are clamped to stay within the walls. */
export function rails(cmFar: number): RailSpec[] {
  return railZs(cmFar).map((z, i) => {
    const half = inTunnel(z, cmFar) ? 0.4 : 1.1
    return { id: `rail${i}`, a: { x: -half, y: RAIL_Y, z }, b: { x: half, y: RAIL_Y, z } }
  })
}

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
})

/**
 * Collision for the three rooms. The tunnel collides only on its two side slabs and a ceiling,
 * so a vertical capsule on the centre line passes (the tunnel is 0.9 m across).
 */
export function collisionBoxes(cmFar: number): Box[] {
  const zMin = LANDER_Z0 - 0.5
  const zMax = cmFar + CM_LENGTH + 0.5
  const w = ROOM_HALF_W
  const o = w + 0.5
  return [
    box(-o, o, -0.5, 0, zMin, zMax), // floor
    box(-o, o, ROOM_H, ROOM_H + 0.5, zMin, LANDER_Z1), // lander ceiling
    box(-o, o, ROOM_H, ROOM_H + 0.5, cmFar, zMax), // command module ceiling
    box(-o, o, TUNNEL_CEILING, ROOM_H + 0.5, LANDER_Z1, cmFar), // tunnel ceiling
    box(-o, -1.1, 0, ROOM_H, zMin, LANDER_Z1), // lander left: breaker panels
    box(w, o, 0, ROOM_H, zMin, LANDER_Z1), // lander right
    box(-o, o, 0, ROOM_H, zMin, LANDER_Z0), // lander back
    box(-o, -TUNNEL_HALF, 0, ROOM_H, LANDER_Z1, cmFar), // tunnel left slab
    box(TUNNEL_HALF, o, 0, ROOM_H, LANDER_Z1, cmFar), // tunnel right slab
    box(-o, -w, 0, ROOM_H, cmFar, zMax), // command module left
    box(w, o, 0, ROOM_H, cmFar, zMax), // command module right
    box(-o, o, 0, ROOM_H, cmFar + CM_LENGTH, zMax), // command module end
  ]
}

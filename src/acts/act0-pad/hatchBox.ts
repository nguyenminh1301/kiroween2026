// The dark cabin box behind the open hatch: a back plate and four walls, all solid, with a faint couch shape.
// The spacecraft skin is a polygon that sits behind z = HATCH_FACE_Z, so the box stands in front of it and the
// open hatch never shows the skin. Plain data, no Three.js or React imports.
import type { Box } from '../../engine/collision'
import { HATCH_POS } from './room'

/** The outer face of the spacecraft skin at the hatch. */
export const SKIN_Z = -9
/** Box mouth, open to the room, flush with the front of the closed hatch leaf. */
export const BOX_FRONT_Z = SKIN_Z + 0.14
export const BOX_BACK_Z = SKIN_Z + 0.03
/** Clear opening size, smaller than the hatch leaf so the leaf hides the walls when closed. */
export const BOX_W = 0.8
export const BOX_H = 0.86
const WALL = 0.04

const b = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({
  min: { x: x0, y: y0, z: z0 },
  max: { x: x1, y: y1, z: z1 },
})

/** The five solid parts. Each wall overlaps its neighbours by `WALL`, so there is no gap at any edge. */
export function hatchBoxParts(): Box[] {
  const x0 = HATCH_POS.x - BOX_W / 2
  const x1 = HATCH_POS.x + BOX_W / 2
  const y0 = HATCH_POS.y - BOX_H / 2
  const y1 = HATCH_POS.y + BOX_H / 2
  return [
    // Back plate, wider than the opening by the wall thickness on each side.
    b(x0 - WALL, y0 - WALL, BOX_BACK_Z - WALL, x1 + WALL, y1 + WALL, BOX_BACK_Z),
    // Left and right walls, full height with the top and bottom thickness.
    b(x0 - WALL, y0 - WALL, BOX_BACK_Z - WALL, x0, y1 + WALL, BOX_FRONT_Z),
    b(x1, y0 - WALL, BOX_BACK_Z - WALL, x1 + WALL, y1 + WALL, BOX_FRONT_Z),
    // Floor and roof.
    b(x0 - WALL, y0 - WALL, BOX_BACK_Z - WALL, x1 + WALL, y0, BOX_FRONT_Z),
    b(x0 - WALL, y1, BOX_BACK_Z - WALL, x1 + WALL, y1 + WALL, BOX_FRONT_Z),
  ]
}

/** Two faint couch shapes on the back plate: a seat and a tilted back each, a shade lighter than the dark. */
export function hatchCouches(): Box[] {
  const z0 = BOX_BACK_Z
  const z1 = BOX_BACK_Z + 0.012
  const out: Box[] = []
  for (const cx of [HATCH_POS.x - 0.17, HATCH_POS.x + 0.17]) {
    out.push(b(cx - 0.11, HATCH_POS.y - 0.3, z0, cx + 0.11, HATCH_POS.y - 0.22, z1))
    out.push(b(cx - 0.11, HATCH_POS.y - 0.22, z0, cx - 0.05, HATCH_POS.y + 0.12, z1))
  }
  return out
}

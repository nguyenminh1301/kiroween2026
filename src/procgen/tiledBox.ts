// Box and cylinder geometry whose UVs repeat a texture every `tile` metres, and a merge helper
// so a whole group of static pieces becomes one draw call.
import { BoxGeometry, CylinderGeometry, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Box } from '../engine/collision'

export const DEFAULT_TILE = 2

/** A box from `min` to `max`, positioned in world space, with metre-scaled UVs. */
export function tiledBoxAt(box: Box, tile = DEFAULT_TILE): BoxGeometry {
  const w = box.max.x - box.min.x
  const h = box.max.y - box.min.y
  const d = box.max.z - box.min.z
  const g = new BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  // Face order: +x, -x, +y, -y, +z, -z. Each face has 4 vertices.
  const sizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    const [su, sv] = sizes[f]
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i
      uv.setXY(k, (uv.getX(k) * su) / tile, (uv.getY(k) * sv) / tile)
    }
  }
  g.translate(box.min.x + w / 2, box.min.y + h / 2, box.min.z + d / 2)
  return g
}

/** A vertical cylinder around the y axis. The texture wraps once around and repeats every `tileV` metres of height. */
export function tiledCylinder(
  rTop: number,
  rBottom: number,
  height: number,
  x: number,
  y: number,
  z: number,
  tileV = 6,
  sides = 12,
): CylinderGeometry {
  const g = new CylinderGeometry(rTop, rBottom, height, sides, 1)
  const uv = g.attributes.uv
  // Side faces come first in the buffer. Scale their v by the height.
  const sideVerts = (sides + 1) * 2
  for (let i = 0; i < sideVerts; i++) uv.setY(i, uv.getY(i) * (height / tileV))
  g.translate(x, y, z)
  return g
}

/** Merge geometries that share attributes into one. Disposes the inputs. */
export function mergeStatic(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

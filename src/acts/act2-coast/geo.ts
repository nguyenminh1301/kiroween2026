// Geometry helpers for act 2: vertex-colored boxes and cylinders merged into one mesh.
import {
  BoxGeometry,
  CylinderGeometry,
  Color,
  Float32BufferAttribute,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function paint(g: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  return g
}

/** A colored box centred at (x, y, z). */
export function cbox(w: number, h: number, d: number, color: string, x: number, y: number, z: number): BufferGeometry {
  const g = new BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return paint(g, color)
}

/** A colored cylinder along `axis`, centred at (x, y, z). */
export function ccyl(
  r: number,
  len: number,
  color: string,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'y' | 'z' = 'y',
  sides = 6,
): BufferGeometry {
  const g = new CylinderGeometry(r, r, len, sides, 1)
  if (axis === 'x') g.rotateZ(Math.PI / 2)
  if (axis === 'z') g.rotateX(Math.PI / 2)
  g.translate(x, y, z)
  return paint(g, color)
}

/** Merge colored parts into one geometry and dispose the inputs. */
export function mergeColored(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

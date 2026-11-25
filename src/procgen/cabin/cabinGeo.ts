// Cabin shell, couches and window quads, built in code. No React imports.
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, type BufferGeometry as BG } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COUCH_X, SHELL_PROFILE, SHELL_SIDES } from './layout'

/** Wall radius at height y, along the profile. */
export function wallRadius(y: number): number {
  const p = SHELL_PROFILE
  if (y <= p[0][0]) return p[0][1]
  for (let i = 0; i < p.length - 1; i++) {
    const [y0, r0] = p[i]
    const [y1, r1] = p[i + 1]
    if (y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0)
  }
  return p[p.length - 1][1]
}

/** Slope angle of the wall below the roof, used to tilt the side windows. */
export const WALL_SLOPE = Math.atan((SHELL_PROFILE[0][1] - SHELL_PROFILE[1][1]) / (SHELL_PROFILE[1][0] - SHELL_PROFILE[0][0]))

/**
 * Ten-sided cone shell. Face centres sit at 18 + 36k degrees from forward (-z), so there is
 * a face straight left and right. Each face tiles the cabinPanel texture once across.
 */
export function buildShell(): BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const n = SHELL_SIDES
  const vert = (k: number, y: number): [number, number, number] => {
    const th = (k * 2 * Math.PI) / n
    const r = wallRadius(y)
    return [r * Math.sin(th), y, -r * Math.cos(th)]
  }
  const rings = SHELL_PROFILE
  let vOff = 0
  for (let s = 0; s < rings.length - 1; s++) {
    const [y0] = rings[s]
    const [y1] = rings[s + 1]
    const len = Math.hypot(y1 - y0, rings[s + 1][1] - rings[s][1])
    const v1 = vOff + len / 1.6
    for (let k = 0; k < n; k++) {
      const a = vert(k, y0)
      const b = vert(k + 1, y0)
      const c = vert(k + 1, y1)
      const d = vert(k, y1)
      const base = pos.length / 3
      pos.push(...a, ...b, ...c, ...d)
      uv.push(0, vOff, 1, vOff, 1, v1, 0, v1)
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2)
    }
    vOff = v1
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function paint(g: BG, color: string): BG {
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

function part(w: number, h: number, d: number, x: number, y: number, z: number, color: string, rotX = 0): BG {
  const g = new BoxGeometry(w, h, d)
  if (rotX) g.rotateX(rotX)
  g.translate(x, y, z)
  g.deleteAttribute('uv')
  return paint(g.toNonIndexed(), color)
}

const CANVAS = '#a89870'
const FRAME = '#4a463c'
const DARK = '#2c2820'

/** Three couches side by side, one merged vertex-colored geometry. */
export function buildCouches(): BufferGeometry {
  const parts: BG[] = []
  for (const x of COUCH_X) {
    parts.push(part(0.52, 0.1, 0.62, x, 0.4, 0.7, CANVAS))
    parts.push(part(0.52, 0.85, 0.1, x, 0.85, 1.05, CANVAS, -0.25))
    parts.push(part(0.3, 0.2, 0.1, x, 1.38, 1.15, FRAME))
    parts.push(part(0.5, 0.08, 0.5, x, 0.18, 0.12, CANVAS, 0.3))
    parts.push(part(0.06, 1.0, 0.06, x - 0.27, -0.1, 0.7, FRAME))
    parts.push(part(0.06, 1.0, 0.06, x + 0.27, -0.1, 0.7, FRAME))
    parts.push(part(0.56, 0.05, 0.05, x, 0.36, 0.38, DARK))
  }
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

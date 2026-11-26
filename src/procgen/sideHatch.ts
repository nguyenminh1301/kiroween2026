// The Apollo side hatch: a rounded door in a frame with a handle, bolts, hinge pegs and a small window.
// Built in code, faces +z, centred on its own origin. About 0.98 m wide and 1.04 m tall with the frame.
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  TorusGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function paint(g: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3)
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  g.deleteAttribute('uv')
  return g
}

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

const slab = (w: number, h: number, r: number, depth: number, z: number, color: string) => {
  const g = new ExtrudeGeometry(roundedRect(w, h, r), { depth, bevelEnabled: false, curveSegments: 3 })
  g.translate(0, 0, z)
  return paint(g, color)
}

/** The door without its handle, which `buildHatchHandle` makes so it can turn. */
export function buildSideHatch(): BufferGeometry {
  const parts: BufferGeometry[] = [
    slab(0.98, 1.04, 0.2, 0.05, 0, '#8f8979'),
    slab(0.82, 0.88, 0.17, 0.05, 0.05, '#d3ccba'),
    slab(0.68, 0.74, 0.14, 0.02, 0.1, '#c2bba8'),
  ]
  // Window, upper left, with a dark ring around it.
  const win = new CircleGeometry(0.1, 10)
  win.translate(-0.12, 0.2, 0.125)
  parts.push(paint(win, '#16212c'))
  const ring = new TorusGeometry(0.105, 0.017, 4, 10)
  ring.translate(-0.12, 0.2, 0.12)
  parts.push(paint(ring, '#5f5a4e'))
  // Bolts around the door edge and hinge pegs down the left side.
  const bolt = (x: number, y: number, r = 0.016) => {
    const g = new CylinderGeometry(r, r, 0.03, 5)
    g.rotateX(Math.PI / 2)
    g.translate(x, y, 0.105)
    parts.push(paint(g, '#4d493f'))
  }
  for (let i = 0; i < 5; i++) {
    const x = -0.33 + i * 0.165
    bolt(x, 0.395)
    bolt(x, -0.395)
  }
  for (let j = 1; j < 4; j++) {
    const y = -0.395 + j * 0.2
    bolt(-0.375, y)
    bolt(0.375, y)
  }
  for (const y of [-0.28, 0.28]) {
    const peg = new CylinderGeometry(0.03, 0.03, 0.07, 6)
    peg.translate(-0.5, y, 0.03)
    parts.push(paint(peg, '#6d675a'))
  }
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p))
  const merged = mergeGeometries(flat, false)
  parts.forEach((p) => p.dispose())
  flat.forEach((p) => p.dispose())
  return merged
}

/** The handle alone, centred on its hub at the origin, facing +z. */
export function buildHatchHandle(): BufferGeometry {
  const hub = new CylinderGeometry(0.045, 0.045, 0.05, 8)
  hub.rotateX(Math.PI / 2)
  hub.translate(0, 0, 0.01)
  const bar = new CylinderGeometry(0.018, 0.018, 0.34, 6)
  bar.rotateZ(Math.PI / 2)
  bar.translate(0.02, 0, 0.04)
  const parts = [paint(hub, '#4a463c'), paint(bar, '#35322b')]
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p))
  const merged = mergeGeometries(flat, false)
  parts.forEach((p) => p.dispose())
  flat.forEach((p) => p.dispose())
  return merged
}

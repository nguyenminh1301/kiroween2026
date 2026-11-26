// Small cabin props, one merged vertex-colored geometry each: checklist card, pencil, pouch and camera.
// Built in code. No React imports.
import { BoxGeometry, CylinderGeometry, Color, Float32BufferAttribute, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type PropKind = 'card' | 'pencil' | 'pouch' | 'camera'

function paint(g: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3)
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  g.deleteAttribute('uv')
  return g
}

const box = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0): BufferGeometry => {
  const g = new BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return paint(g.toNonIndexed(), color)
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const m = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return m
}

export function buildProp(kind: PropKind): BufferGeometry {
  switch (kind) {
    case 'card':
      return merge([box(0.16, 0.22, 0.012, '#e9e4d2'), box(0.16, 0.02, 0.016, '#8e3b22', 0, 0.1, 0), box(0.1, 0.01, 0.014, '#3a342a', 0, 0.03, 0)])
    case 'pencil': {
      const g = new CylinderGeometry(0.006, 0.006, 0.17, 5)
      g.rotateZ(Math.PI / 2)
      return merge([paint(g.toNonIndexed(), '#e2782f')])
    }
    case 'pouch':
      return merge([box(0.14, 0.09, 0.07, '#b9b19a'), box(0.14, 0.015, 0.075, '#6c7074', 0, 0.04, 0)])
    case 'camera':
      return merge([box(0.18, 0.1, 0.1, '#2a2622'), box(0.06, 0.06, 0.07, '#17150f', 0, 0, 0.08), box(0.04, 0.02, 0.04, '#b9b19a', 0.05, 0.06, 0)])
  }
}

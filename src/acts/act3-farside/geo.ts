// Geometry helpers for act 3: a quad builder with vertex colors, boxes and cylinders merged into one mesh.
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type P3 = [number, number, number]

/** Collects quads (two triangles each) with UVs and vertex colors into one geometry. */
export class QuadBuilder {
  private pos: number[] = []
  private uv: number[] = []
  private col: number[] = []

  /** A quad a, b, c, d (in order around). `uvs` are the (u, v) of a and c; u runs a to b. */
  quad(a: P3, b: P3, c: P3, d: P3, u0: number, v0: number, u1: number, v1: number, color: string | Color): void {
    const col = color instanceof Color ? color : new Color(color)
    const pts = [a, b, c, a, c, d]
    const uvs: Array<[number, number]> = [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]]
    for (let i = 0; i < 6; i++) {
      this.pos.push(...pts[i])
      this.uv.push(...uvs[i])
      this.col.push(col.r, col.g, col.b)
    }
  }

  /** A triangle fan around `center` through `ring`. */
  fan(center: P3, ring: P3[], color: string): void {
    const col = new Color(color)
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      for (const p of [center, a, b]) {
        this.pos.push(...p)
        this.uv.push(p[0] * 0.5, p[1] * 0.5)
        this.col.push(col.r, col.g, col.b)
      }
    }
  }

  build(): BufferGeometry {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3))
    g.computeVertexNormals()
    return g
  }
}

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

export function cbox(w: number, h: number, d: number, color: string, x: number, y: number, z: number): BufferGeometry {
  const g = new BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return paint(g, color)
}

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

/** Merge parts that all have position, normal, uv and color, and dispose the inputs. */
export function mergeColored(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

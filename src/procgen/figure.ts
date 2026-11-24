// A low-poly suited person built from boxes and cylinders as a small bone hierarchy.
// Faces +z, about 1.8 m tall. Parts of one bone are merged into one mesh with vertex colors.
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  Object3D,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createMaterial, disposeMaterial } from '../render/materialFactory'
import { registerHeadAnchor } from './anchors'
import { poseFor, type BoneName, type PoseKind } from './figurePose'

export interface FigureOptions {
  /** Registers a head anchor under this name. */
  name?: string
  helmet?: boolean
  suit?: 'pressure' | 'coverall'
}

export interface Figure {
  root: Group
  /** The head anchor object, at about 1.7 m for a standing figure. */
  head: Object3D
  triangles: number
  setPose(kind: PoseKind, t: number, amount?: number): void
  dispose(): void
}

const HIP_Y = 0.95
const NECK_Y = 1.53

const SUIT = { pressure: '#f2ebdd', coverall: '#e6e1d2' }
const BOOT = '#6d6a62'
const GLOVE = '#cfc7b4'
const BELT = '#4a463c'

function colored(g: BufferGeometry, color: string, dx = 0, dy = 0, dz = 0): BufferGeometry {
  g.translate(dx, dy, dz)
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

const box = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0) =>
  colored(new BoxGeometry(w, h, d), color, x, y, z)
const cyl = (r0: number, r1: number, h: number, color: string, x = 0, y = 0, z = 0) =>
  colored(new CylinderGeometry(r0, r1, h, 8, 1), color, x, y, z)

function triCount(g: BufferGeometry): number {
  return g.index ? g.index.count / 3 : g.attributes.position.count / 3
}

export function buildFigure(opts: FigureOptions = {}): Figure {
  const helmet = opts.helmet ?? false
  const suitColor = SUIT[opts.suit ?? 'pressure']
  const material: Material = createMaterial({ vertexColors: true })
  const root = new Group()
  const geoms: BufferGeometry[] = []
  let triangles = 0

  const bone = (parent: Object3D, x: number, y: number, z: number, parts: BufferGeometry[]): Object3D => {
    const o = new Object3D()
    o.position.set(x, y, z)
    parent.add(o)
    if (parts.length) {
      const merged = mergeGeometries(parts, false)
      parts.forEach((p) => p.dispose())
      geoms.push(merged)
      triangles += triCount(merged)
      o.add(new Mesh(merged, material))
    }
    return o
  }

  const hips = bone(root, 0, HIP_Y, 0, [box(0.34, 0.2, 0.2, suitColor, 0, 0.0, 0), box(0.35, 0.05, 0.21, BELT, 0, 0.12, 0)])
  const spine = bone(hips, 0, 0.1, 0, [
    box(0.38, 0.5, 0.22, suitColor, 0, 0.3, 0),
    ...(opts.suit === 'coverall' ? [] : [box(0.14, 0.14, 0.04, '#b8b2a2', 0, 0.38, 0.13)]),
  ])
  const neckY = NECK_Y - HIP_Y - 0.1
  const headParts: BufferGeometry[] = helmet
    ? [
        colored(new SphereGeometry(0.16, 8, 6), '#f2ebdd', 0, 0.14, 0),
        box(0.22, 0.12, 0.05, '#3a2f18', 0, 0.14, 0.13),
      ]
    : [
        // Cap on a dark, featureless face.
        box(0.2, 0.24, 0.2, '#1a1512', 0, 0.12, 0),
        colored(new SphereGeometry(0.115, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#d9d2bf', 0, 0.2, 0),
      ]
  const neck = bone(spine, 0, neckY, 0, [cyl(0.05, 0.06, 0.06, helmet ? '#f2ebdd' : '#1a1512', 0, 0.03, 0)])
  const headBone = bone(neck, 0, 0.03, 0, headParts)
  const head = new Object3D()
  head.position.set(0, 0.14, 0)
  headBone.add(head)

  const side = (sx: 1 | -1) => {
    const shoulder = bone(spine, sx * 0.245, neckY - 0.06, 0, [cyl(0.075, 0.075, 0.1, suitColor, 0, 0, 0)])
    const upper = bone(shoulder, 0, 0, 0, [cyl(0.065, 0.055, 0.3, suitColor, 0, -0.15, 0)])
    const elbow = bone(upper, 0, -0.3, 0, [])
    bone(elbow, 0, 0, 0, [cyl(0.055, 0.05, 0.27, suitColor, 0, -0.135, 0), box(0.09, 0.1, 0.07, GLOVE, 0, -0.32, 0)])
    const hip = bone(hips, sx * 0.1, -0.08, 0, [cyl(0.095, 0.075, 0.43, suitColor, 0, -0.215, 0)])
    const knee = bone(hip, 0, -0.45, 0, [])
    bone(knee, 0, 0, 0, [cyl(0.075, 0.065, 0.3, suitColor, 0, -0.15, 0), box(0.12, 0.1, 0.27, BOOT, 0, -0.3, 0.05)])
    return { shoulder, elbow, hip, knee }
  }
  const L = side(1)
  const R = side(-1)
  const bones: Record<BoneName, Object3D> = {
    spine,
    neck,
    shoulderL: L.shoulder,
    shoulderR: R.shoulder,
    elbowL: L.elbow,
    elbowR: R.elbow,
    hipL: L.hip,
    hipR: R.hip,
    kneeL: L.knee,
    kneeR: R.knee,
  }

  const tmp = new Vector3()
  const removeAnchor = opts.name
    ? registerHeadAnchor(opts.name, () => {
        head.updateWorldMatrix(true, false)
        head.getWorldPosition(tmp)
        return { x: tmp.x, y: tmp.y, z: tmp.z }
      })
    : () => {}

  const figure: Figure = {
    root,
    head,
    triangles,
    setPose(kind, t, amount = 1) {
      const p = poseFor(kind, t, amount)
      hips.position.y = HIP_Y + p.rootY
      root.rotation.set(p.rootRotX, root.rotation.y, p.rootRotZ)
      for (const k of Object.keys(bones) as BoneName[]) bones[k].rotation.set(...p.bones[k])
      // Lying down: the root pivots about the feet, so lift the whole body by the pose offset instead.
      if (kind === 'resting') hips.position.y = HIP_Y
      root.position.y = kind === 'resting' ? p.rootY : 0
    },
    dispose() {
      removeAnchor()
      geoms.forEach((g) => g.dispose())
      disposeMaterial(material)
    },
  }
  figure.setPose('standing', 0)
  root.updateMatrixWorld(true)
  return figure
}

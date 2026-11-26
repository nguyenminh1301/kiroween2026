// A low-poly suited person built from capsules, cylinders and spheres as a small bone hierarchy.
// Faces +z, about 1.8 m tall. Parts of one bone are merged into one mesh with vertex colors.
import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  Object3D,
  SphereGeometry,
  TorusGeometry,
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

const SUIT = { pressure: '#f2ebdd', coverall: '#f4f0e6' }
const SHADE = '#bdb6a4'
const FOLD = '#d4cdba'
const PATCH = '#5a5648'
const POCKET = '#d6d0bf'
const BOOT = '#6d6a62'
const GLOVE = '#cfc7b4'
const BELT = '#4a463c'
const METAL = '#9a9588'
const BLUE = '#2f5f8f'
const RED = '#b03a2a'
const HOSE = '#8a8678'

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
/** A 10-sided tapered tube, `sz` squashes it front to back. */
const cyl = (r0: number, r1: number, h: number, color: string, x = 0, y = 0, z = 0, sz = 1) => {
  const g = new CylinderGeometry(r0, r1, h, 10, 1, h <= 0.05)
  g.scale(1, 1, sz)
  return colored(g, color, x, y, z)
}
const caps = (r: number, len: number, color: string, x = 0, y = 0, z = 0, sz = 1) => {
  const g = new CapsuleGeometry(r, len, 1, 8)
  g.scale(1, 1, sz)
  return colored(g, color, x, y, z)
}
const ball = (r: number, color: string, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const g = new SphereGeometry(r, 7, 5)
  g.scale(sx, sy, sz)
  return colored(g, color, x, y, z)
}
/** A tube along z, for connectors. */
const pipe = (r: number, len: number, color: string, x: number, y: number, z: number) => {
  const g = new CylinderGeometry(r, r, len, 8, 1)
  g.rotateX(Math.PI / 2)
  return colored(g, color, x, y, z)
}
const hose = (r: number, tube: number, arc: number, color: string, x: number, y: number, z: number, rotZ = 0) => {
  const g = new TorusGeometry(r, tube, 4, 8, arc)
  g.rotateZ(rotZ)
  return colored(g, color, x, y, z)
}
/** A red and white striped rectangle on the shoulder: no insignia, only stripes. */
const flag = (x: number, y: number, z: number) => {
  const out: BufferGeometry[] = []
  for (let i = 0; i < 5; i++) out.push(box(0.07, 0.012, 0.012, i % 2 ? '#f4f0e6' : '#b03a2a', x, y + (i - 2) * 0.012, z))
  return out
}

function triCount(g: BufferGeometry): number {
  return g.index ? g.index.count / 3 : g.attributes.position.count / 3
}

export function buildFigure(opts: FigureOptions = {}): Figure {
  const cover = opts.suit === 'coverall'
  // Pressure suits always wear the helmet, so no face is ever shown.
  const helmet = !cover
  const suitColor = SUIT[opts.suit ?? 'pressure']
  const material: Material = createMaterial({ vertexColors: true })
  const glassMat = createMaterial({ vertexColors: true, kind: 'unlit', snap: false, fog: false })
  glassMat.transparent = true
  glassMat.opacity = 0.15
  glassMat.depthWrite = false
  glassMat.side = DoubleSide
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

  const hips = bone(root, 0, HIP_Y, 0, [
    caps(0.15, 0.06, suitColor, 0, -0.02, 0, 0.78),
    cyl(0.185, 0.185, 0.05, BELT, 0, 0.1, 0, 0.78),
    ...(cover
      ? [box(0.06, 0.05, 0.02, '#b8b2a2', 0, 0.1, 0.15), box(0.08, 0.1, 0.03, POCKET, 0.14, -0.04, 0.1), box(0.08, 0.1, 0.03, POCKET, -0.14, -0.04, 0.1)]
      : [box(0.08, 0.1, 0.03, SHADE, 0.17, -0.02, 0.08), box(0.08, 0.1, 0.03, SHADE, -0.17, -0.02, 0.08)]),
  ])
  const spine = bone(hips, 0, 0.1, 0, [
    // Torso: a tapered tube with a rounded shoulder line.
    cyl(0.2, 0.17, 0.46, suitColor, 0, 0.26, 0, 0.74),
    ball(0.2, suitColor, 0, 0.5, 0, 1, 0.42, 0.74),
    cyl(0.205, 0.205, 0.02, FOLD, 0, 0.12, 0, 0.74),
    cyl(0.2, 0.2, 0.02, SHADE, 0, 0.32, 0, 0.74),
    ...(cover
      ? [
          // Chest pockets, a zip and two dark oil patches.
          box(0.09, 0.09, 0.03, POCKET, 0.09, 0.4, 0.15),
          box(0.09, 0.09, 0.03, POCKET, -0.09, 0.4, 0.15),
          box(0.012, 0.4, 0.02, '#a8a290', 0, 0.28, 0.15),
          box(0.1, 0.07, 0.02, PATCH, -0.08, 0.16, 0.14),
        ]
      : [
          // Chest pack on the front, blue and red connectors, hoses, name tag.
          box(0.2, 0.17, 0.07, SHADE, 0, 0.3, 0.14),
          box(0.16, 0.02, 0.075, METAL, 0, 0.36, 0.14),
          pipe(0.025, 0.07, BLUE, -0.12, 0.2, 0.15),
          pipe(0.025, 0.07, RED, 0.12, 0.2, 0.15),
          hose(0.12, 0.014, Math.PI, HOSE, 0, 0.2, 0.15, Math.PI),
          hose(0.07, 0.012, Math.PI, HOSE, 0, 0.3, 0.1, 0),
          box(0.1, 0.028, 0.012, '#26303c', 0.1, 0.42, 0.15),
          box(0.06, 0.008, 0.014, '#d9d2bf', 0.1, 0.42, 0.153),
          box(0.12, 0.2, 0.08, SHADE, 0, 0.32, -0.15),
        ]),
  ])
  const neckY = NECK_Y - HIP_Y - 0.1

  // Head: a clear bubble with a dark gold curved visor, or a soft cap over a shadowed face.
  const headParts: BufferGeometry[] = []
  const bubbleParts: BufferGeometry[] = []
  if (helmet) {
    headParts.push(
      ball(0.115, '#2c2a33', 0, 0.14, 0),
      cyl(0.125, 0.14, 0.04, '#cfc7b4', 0, 0.0, 0),
      // Visor down: a curved shell on the front of the bubble, dark gold with a light edge.
      colored(new SphereGeometry(0.168, 10, 6, Math.PI / 2 - 1.0, 2.0, 0.8, 1.05), '#8a6a22', 0, 0.14, 0),
      colored(new SphereGeometry(0.17, 6, 3, Math.PI / 2 + 0.25, 0.55, 0.55, 0.3), '#e6cf86', 0, 0.14, 0),
    )
    bubbleParts.push(colored(new SphereGeometry(0.172, 9, 7), '#ffffff', 0, 0.14, 0))
  } else {
    headParts.push(
      // Deep warm shadow under the cap, rounded.
      ball(0.1, '#33231b', 0, 0.12, 0.01, 0.92, 1.12, 1),
      cyl(0.04, 0.05, 0.05, '#33231b', 0, 0.0, 0),
      colored(new SphereGeometry(0.118, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#e9e4d6', 0, 0.17, -0.005),
      colored(new CylinderGeometry(0.12, 0.12, 0.014, 8, 1, false, -Math.PI / 2, Math.PI), '#d9d2bf', 0, 0.185, 0.04),
    )
  }
  const neck = bone(spine, 0, neckY, 0, [cyl(0.055, 0.07, 0.07, helmet ? '#cfc7b4' : '#33231b', 0, 0.02, 0)])
  const headBone = bone(neck, 0, 0.03, 0, headParts)
  if (bubbleParts.length) {
    const g = mergeGeometries(bubbleParts, false)
    bubbleParts.forEach((p) => p.dispose())
    geoms.push(g)
    triangles += triCount(g)
    const m = new Mesh(g, glassMat)
    m.renderOrder = 2
    headBone.add(m)
  }
  const head = new Object3D()
  head.position.set(0, 0.14, 0)
  headBone.add(head)

  const side = (sx: 1 | -1) => {
    const shoulder = bone(spine, sx * 0.235, neckY - 0.07, 0, [ball(0.085, suitColor, 0, 0, 0)])
    const upper = bone(shoulder, 0, 0, 0, [caps(0.058, 0.2, suitColor, 0, -0.15, 0), cyl(0.062, 0.062, 0.02, FOLD, 0, -0.08, 0)])
    // Flag patch on the outside of the left upper arm.
    if (!cover && sx === 1) {
      const merged = mergeGeometries(flag(0, 0, 0), false)
      merged.rotateY(Math.PI / 2)
      merged.translate(0.064, -0.1, 0)
      geoms.push(merged)
      triangles += triCount(merged)
      upper.add(new Mesh(merged, material))
    }
    const elbow = bone(upper, 0, -0.3, 0, [ball(0.062, SHADE, 0, 0, 0)])
    bone(elbow, 0, 0, 0, [
      caps(0.052, 0.17, suitColor, 0, -0.135, 0),
      cyl(0.056, 0.056, 0.02, FOLD, 0, -0.07, 0),
      // Glove cuff ring and a rounded hand.
      cyl(0.058, 0.058, 0.04, METAL, 0, -0.26, 0),
      ball(0.058, GLOVE, 0, -0.32, 0.005, 1, 1.15, 0.8),
      ...(cover ? [cyl(0.06, 0.06, 0.04, PATCH, 0, -0.04, 0)] : []),
    ])
    const hip = bone(hips, sx * 0.1, -0.08, 0, [
      caps(0.085, 0.3, suitColor, 0, -0.215, 0),
      cyl(0.09, 0.09, 0.02, FOLD, 0, -0.12, 0),
    ])
    const knee = bone(hip, 0, -0.45, 0, [ball(0.075, SHADE, 0, 0, 0.01, 1, 0.9, 1)])
    bone(knee, 0, 0, 0, [
      caps(0.07, 0.15, suitColor, 0, -0.15, 0),
      cyl(0.072, 0.072, 0.02, FOLD, 0, -0.07, 0),
      // Boot: ankle ring, rounded foot, sole.
      cyl(0.075, 0.08, 0.1, BOOT, 0, -0.27, 0),
      ball(0.07, BOOT, 0, -0.32, 0.06, 1, 0.7, 1.9),
      box(0.12, 0.02, 0.26, '#3f3d37', 0, -0.365, 0.06),
      ...(cover ? [cyl(0.074, 0.074, 0.04, PATCH, 0, -0.04, 0)] : []),
    ])
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
      disposeMaterial(glassMat)
    },
  }
  figure.setPose('standing', 0)
  root.updateMatrixWorld(true)
  return figure
}

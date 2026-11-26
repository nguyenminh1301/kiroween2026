// The act 3 creature: a thin deformed astronaut about 2.4 m tall, built from boxes and spheres in code.
// Torn stained suit, long limbs, long-fingered gloves, dark skin in the tears, cracked dark visor, no face.
// The head splits into a wide mouth for the lunge. Every mesh has an inverted-hull twin in unlit dark red
// that gives the dim rim in the dark; the scene has no second dynamic light. At most 3,000 triangles.
import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, SphereGeometry, type Material } from 'three'
import { cbox, mergeColored } from './coloredGeo'
import { anglesFor, headToward, snapTime } from './astronautPose'
import { lungeFrame, lungeDistance, type LungeFrame } from './lunge'

export const ASTRONAUT_MAX_TRIANGLES = 3000
const SUIT = '#cfc8b4'
const STAIN = '#7b6a52'
const DARK_SUIT = '#5a5446'
const SKIN = '#2a1c1a'
const VISOR = '#0c0a0b'
const CRACK = '#4a4448'
const GLOVE = '#9d9582'
const THROAT = '#1a0508'
const TOOTH = '#c9c0a4'
const RIM_SCALE = 1.07
const HEAD_R = 0.19

type J3 = [Group, Group, Group]

export interface Astronaut {
  root: Group
  spine: Group
  neck: Group
  head: Group
  jaw: Group
  arm: [J3, J3]
  leg: [J3, J3]
  triangles: number
  /** Distance the head sits above the floor when standing. */
  height: number
}

function paintGeo(g: BufferGeometry, color: string): BufferGeometry {
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

function half(upper: boolean, color: string): BufferGeometry {
  const g = upper
    ? new SphereGeometry(HEAD_R, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)
    : new SphereGeometry(HEAD_R, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
  g.scale(1, upper ? 1.25 : 0.9, 1.05)
  return paintGeo(g, color)
}

export function buildAstronaut(mat: Material, rimMat: Material): Astronaut {
  let triangles = 0
  const add = (parent: Group, geo: BufferGeometry): void => {
    const body = new Mesh(geo, mat)
    const rim = new Mesh(geo, rimMat)
    rim.scale.setScalar(RIM_SCALE)
    parent.add(body, rim)
    const idx = geo.index ? geo.index.count : geo.attributes.position.count
    triangles += (idx / 3) * 2
  }
  const seg = (len: number, w: number, color: string, extra: BufferGeometry[] = []): BufferGeometry =>
    mergeColored([cbox(w, len, w, color, 0, -len / 2, 0), ...extra])

  const root = new Group()
  const spine = new Group()
  spine.position.set(0, 1.25, 0)
  root.add(spine)
  add(root, mergeColored([cbox(0.3, 0.2, 0.2, DARK_SUIT, 0, 1.2, 0)]))
  // Torso: thin, with a stained front and a tear showing skin.
  add(
    spine,
    mergeColored([
      cbox(0.34, 0.85, 0.2, SUIT, 0, 0.42, 0),
      cbox(0.2, 0.3, 0.21, STAIN, -0.05, 0.3, 0),
      cbox(0.1, 0.22, 0.215, SKIN, 0.08, 0.55, 0),
      cbox(0.38, 0.08, 0.22, DARK_SUIT, 0, 0.84, 0),
    ]),
  )
  const neck = new Group()
  neck.position.set(0, 0.88, 0.02)
  spine.add(neck)
  add(neck, mergeColored([cbox(0.07, 0.3, 0.07, SKIN, 0, 0.14, 0)]))
  const head = new Group()
  head.position.set(0, 0.3, 0.02)
  neck.add(head)
  // Upper helmet and visor.
  add(head, half(true, SUIT))
  add(
    head,
    mergeColored([
      cbox(0.26, 0.16, 0.05, VISOR, 0, 0.1, HEAD_R * 0.9),
      cbox(0.015, 0.15, 0.052, CRACK, 0.04, 0.1, HEAD_R * 0.9 + 0.002),
      cbox(0.1, 0.012, 0.052, CRACK, -0.03, 0.12, HEAD_R * 0.9 + 0.002),
    ]),
  )
  // Teeth in the upper half, hidden while the head is closed.
  const upperTeeth: BufferGeometry[] = []
  const lowerTeeth: BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.045
    const h = 0.04 + ((i * 5) % 4) * 0.02
    upperTeeth.push(cbox(0.022, h, 0.022, TOOTH, x, -h / 2, HEAD_R * 0.75 - Math.abs(i - 3) * 0.015))
    lowerTeeth.push(cbox(0.02, h * 1.1, 0.02, TOOTH, x + 0.012, h * 0.55, HEAD_R * 0.75 - Math.abs(i - 3) * 0.015))
  }
  add(head, mergeColored([...upperTeeth, cbox(0.3, 0.02, 0.3, THROAT, 0, 0.0, 0)]))
  // The jaw: hinged at the back, opens by rotating about x.
  const jaw = new Group()
  jaw.position.set(0, 0, -0.1)
  head.add(jaw)
  const jawBody = mergeColored([half(false, SUIT), ...lowerTeeth.map((g) => g)])
  const jawMesh = new Group()
  jawMesh.position.set(0, 0, 0.1)
  jaw.add(jawMesh)
  add(jawMesh, jawBody)
  add(jawMesh, mergeColored([cbox(0.2, 0.02, 0.22, THROAT, 0, -0.01, 0)]))

  const limb = (x: number, y: number, lens: [number, number, number], w: number, fingers: boolean, parent: Group): J3 => {
    const a = new Group()
    a.position.set(x, y, 0)
    add(a, seg(lens[0], w, SUIT, [cbox(w * 1.05, lens[0] * 0.3, w * 1.05, STAIN, 0, -lens[0] * 0.3, 0)]))
    const b = new Group()
    b.position.y = -lens[0]
    add(b, seg(lens[1], w * 0.85, DARK_SUIT, [cbox(w * 0.5, lens[1] * 0.2, w * 0.9, SKIN, 0, -lens[1] * 0.5, 0)]))
    const c = new Group()
    c.position.y = -lens[1]
    const parts: BufferGeometry[] = []
    if (fingers) {
      for (let f = 0; f < 5; f++) parts.push(cbox(0.016, 0.3 + (f % 2) * 0.06, 0.016, GLOVE, (f - 2) * 0.026, -lens[2] - 0.15, 0))
    } else {
      parts.push(cbox(0.12, 0.07, 0.3, DARK_SUIT, 0, -lens[2] - 0.02, 0.09))
    }
    add(c, seg(lens[2], w * 0.7, fingers ? GLOVE : SUIT, parts))
    a.add(b)
    b.add(c)
    parent.add(a)
    return [a, b, c]
  }
  const arm: [J3, J3] = [limb(-0.25, 0.8, [0.75, 0.75, 0.2], 0.07, true, spine), limb(0.25, 0.8, [0.75, 0.75, 0.2], 0.07, true, spine)]
  const leg: [J3, J3] = [limb(-0.1, 1.2, [0.65, 0.65, 0.2], 0.1, false, root), limb(0.1, 1.2, [0.65, 0.65, 0.2], 0.1, false, root)]
  return { root, spine, neck, head, jaw, arm, leg, triangles, height: 2.4 }
}

export interface PoseOpts {
  /** World position and heading of the creature, and the last sound, for the head tilt. */
  x?: number
  z?: number
  heading?: number
  sound?: { x: number; z: number } | null
  /** Seconds into the lunge, or null. */
  lunge?: number | null
}

/** Pose the bones. Time snaps to 8 steps per second so the poses are held. */
export function poseAstronaut(b: Astronaut, anim: 'walk' | 'freeze' | 'crawl', t: number, phase: number, o: PoseOpts = {}): void {
  const st = snapTime(t)
  const ang = anglesFor(anim, snapTime(phase / 4) * 4)
  const set = (j: J3, a: [number, number, number]): void => {
    j[0].rotation.x = a[0]
    j[1].rotation.x = a[1]
    j[2].rotation.x = a[2]
  }
  b.spine.rotation.x = ang.spine
  b.neck.rotation.x = ang.neckX
  set(b.arm[0], ang.arm[0])
  set(b.arm[1], ang.arm[1])
  set(b.leg[0], ang.leg[0])
  set(b.leg[1], ang.leg[1])
  b.arm[0][0].rotation.z = 0.12
  b.arm[1][0].rotation.z = -0.12
  const toward = o.sound && o.x !== undefined && o.z !== undefined && o.heading !== undefined ? headToward(o.x, o.z, o.heading, o.sound.x, o.sound.z) : 0
  b.head.rotation.y = toward
  b.head.rotation.z = anim === 'freeze' ? Math.sin(st * 0.9) * 0.3 : Math.sin(st * 2.1) * 0.08
  b.jaw.rotation.x = 0
  b.head.scale.setScalar(1)
  if (o.lunge !== null && o.lunge !== undefined) poseLunge(b, lungeFrame(o.lunge))
}

function poseLunge(b: Astronaut, f: LungeFrame): void {
  // Crouched and bent at the start, standing and reaching at the end.
  b.spine.rotation.x = 0.9 - f.rise * 0.9 + f.reach * 0.6
  b.neck.rotation.x = -0.2 + f.reach * 0.3
  b.head.rotation.set(0, 0, 0)
  b.leg.forEach(([h, k, a]) => {
    h.rotation.x = -1.1 * (1 - f.rise)
    k.rotation.x = 1.5 * (1 - f.rise)
    a.rotation.x = -0.3
  })
  b.arm.forEach(([s, e, w]) => {
    s.rotation.x = -1.2 - f.reach * 1.2
    e.rotation.x = 0.3
    w.rotation.x = -0.2
  })
  b.jaw.rotation.x = f.jaw * 1.25
  b.head.scale.setScalar(1 + f.jaw * 1.4 + f.reach * 0.8)
}

export { lungeDistance }

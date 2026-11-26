// The Apollo launch escape system, built from code: an open lattice truss, the white escape motor and a short
// black and white nose with canards and a pointed tip. About 10 m tall. No React import.
import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three'
import { mergeStatic, tiledCylinder } from './tiledBox'

export const TOWER = {
  truss: 3,
  trussBase: 1.2,
  trussTop: 0.6,
  motorWidth: 0.7,
  motorLength: 4.5,
  noseLength: 2.5,
} as const
export const TOWER_HEIGHT = TOWER.truss + TOWER.motorLength + TOWER.noseLength

/** A thin 4-sided bar from `a` to `b`. */
export function bar(a: Vector3, b: Vector3, r: number): BufferGeometry {
  const dir = new Vector3().subVectors(b, a)
  const len = dir.length()
  const g = new CylinderGeometry(r, r, len, 4, 1)
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
  g.applyMatrix4(new Matrix4().compose(new Vector3().addVectors(a, b).multiplyScalar(0.5), q, new Vector3(1, 1, 1)))
  return g
}

function truss(x: number, y: number, z: number): BufferGeometry {
  const parts: BufferGeometry[] = []
  const bays = 3
  const half = (t: number): number => (TOWER.trussBase + (TOWER.trussTop - TOWER.trussBase) * t) / 2
  const corner = (i: number, t: number): Vector3 => {
    const h = half(t)
    const sx = i === 0 || i === 3 ? -1 : 1
    const sz = i < 2 ? -1 : 1
    return new Vector3(x + sx * h, y + t * TOWER.truss, z + sz * h)
  }
  for (let i = 0; i < 4; i++) parts.push(bar(corner(i, 0), corner(i, 1), 0.045))
  for (let k = 0; k <= bays; k++) {
    const t = k / bays
    for (let i = 0; i < 4; i++) parts.push(bar(corner(i, t), corner((i + 1) % 4, t), 0.03))
  }
  for (let k = 0; k < bays; k++) {
    const t0 = k / bays
    const t1 = (k + 1) / bays
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      parts.push(bar(corner(i, t0), corner(j, t1), 0.025))
      parts.push(bar(corner(j, t0), corner(i, t1), 0.025))
    }
  }
  return mergeStatic(parts)
}

/** `baseY` is the top of the command module cone. Returns white and dark geometries. */
export function buildEscapeTower(x: number, baseY: number, z: number): { white: BufferGeometry; dark: BufferGeometry } {
  const r = TOWER.motorWidth / 2
  const motorY = baseY + TOWER.truss
  const noseY = motorY + TOWER.motorLength
  const white = [
    tiledCylinder(r, r, TOWER.motorLength, x, motorY + TOWER.motorLength / 2, z, 3, 12),
    tiledCylinder(r, r, 0.4, x, noseY + 0.2, z, 3, 10),
  ]
  const dark = [truss(x, baseY, z), tiledCylinder(r, r, 0.6, x, noseY + 0.7, z, 3, 10), tiledCylinder(0.02, r, 1.5, x, noseY + 1.75, z, 3, 10)]
  for (let i = 0; i < 4; i++) {
    const fin = new BoxGeometry(0.6, 0.02, 0.3)
    fin.translate(r + 0.25, 0, 0)
    fin.rotateY((i * Math.PI) / 2 + Math.PI / 4)
    fin.translate(x, noseY + 0.7, z)
    dark.push(fin)
  }
  return { white: mergeStatic(white), dark: mergeStatic(dark) }
}

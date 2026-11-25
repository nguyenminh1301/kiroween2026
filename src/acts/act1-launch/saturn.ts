// The Saturn V as code-built geometry, in three parts so a stage can drop away.
// Each part has its base at y = 0 and comes back as three merged geometries (white, roll pattern, dark).
import { BoxGeometry, ConeGeometry, CylinderGeometry, type BufferGeometry } from 'three'
import { mergeStatic, tiledCylinder } from '../../procgen/tiledBox'

export interface StackGeometry {
  white: BufferGeometry
  roll: BufferGeometry
  dark: BufferGeometry
  height: number
}

export const S_IC_HEIGHT = 44
export const UPPER_HEIGHT = 110 - S_IC_HEIGHT

function bells(count5: boolean, r: number, y: number, spread: number, h: number): BufferGeometry[] {
  const spots = count5
    ? [
        [0, 0],
        [spread, spread],
        [-spread, spread],
        [spread, -spread],
        [-spread, -spread],
      ]
    : [[0, 0]]
  return spots.map(([x, z]) => {
    const g = new CylinderGeometry(r * 0.45, r, h, 8, 1, true)
    g.translate(x, y, z)
    return g
  })
}

/** The first stage: black and white roll pattern, five F-1 bells, four fins, and the short interstage. */
export function buildFirstStage(): StackGeometry {
  const roll = [tiledCylinder(5.05, 5.05, 42, 0, 21, 0, 42, 16)]
  const white = [tiledCylinder(5, 5, 2, 0, 43, 0, 6, 16)]
  const dark = [...bells(true, 1.9, -2, 2.6, 4)]
  for (const [x, z] of [
    [5.2, 0],
    [-5.2, 0],
    [0, 5.2],
    [0, -5.2],
  ]) {
    const f = new BoxGeometry(x ? 3 : 0.4, 9, z ? 3 : 0.4)
    f.translate(x, 4.5, z)
    dark.push(f)
  }
  return { white: mergeStatic(white), roll: mergeStatic(roll), dark: mergeStatic(dark), height: S_IC_HEIGHT }
}

export interface UpperOptions {
  /** Start at the third stage (for the TLI view). */
  fromThird?: boolean
  /** Include the escape tower. */
  tower?: boolean
}

/** Second stage up to the escape tower, base at y = 0. */
export function buildUpperStack(opts: UpperOptions = {}): StackGeometry {
  const white: BufferGeometry[] = []
  const dark: BufferGeometry[] = []
  const roll: BufferGeometry[] = []
  let y = 0
  if (!opts.fromThird) {
    white.push(tiledCylinder(5, 5, 25, 0, 12.5, 0, 25, 16))
    dark.push(...bells(true, 1.0, -1, 1.5, 2.2))
    white.push(tiledCylinder(3.3, 5, 1, 0, 25.5, 0, 6, 16))
    y = 26
  } else {
    dark.push(...bells(false, 1.3, -1.2, 0, 2.6))
  }
  white.push(tiledCylinder(3.3, 3.3, 18, 0, y + 9, 0, 18, 12))
  dark.push(new CylinderGeometry(3.32, 3.32, 1, 12).translate(0, y + 18.5, 0))
  white.push(tiledCylinder(1.95, 3.3, 6, 0, y + 22, 0, 6, 12))
  white.push(tiledCylinder(1.95, 1.95, 7.5, 0, y + 28.75, 0, 7.5, 10))
  dark.push(new CylinderGeometry(1.97, 1.97, 0.6, 10).translate(0, y + 27, 0))
  white.push(tiledCylinder(0.5, 1.95, 3.5, 0, y + 33.75, 0, 3.5, 10))
  if (opts.tower !== false) {
    dark.push(new CylinderGeometry(0.08, 0.08, 4.6, 4).translate(0, y + 37.4, 0))
    white.push(tiledCylinder(0.45, 0.45, 3.4, 0, y + 39.7, 0, 3.4, 6))
    dark.push(new ConeGeometry(0.45, 1.4, 6).translate(0, y + 42.1, 0))
  }
  const height = opts.tower === false ? y + 35.5 : y + 42.8
  const out = { white: mergeStatic(white), roll: roll.length ? mergeStatic(roll) : emptyGeo(), dark: mergeStatic(dark), height }
  return out
}

function emptyGeo(): BufferGeometry {
  return new BoxGeometry(0.001, 0.001, 0.001)
}

/** Red launch tower: four corner columns, cross beams and two swing arms. */
export function buildTower(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const H = 140
  const W = 9
  for (const [x, z] of [
    [-W, -W],
    [W, -W],
    [-W, W],
    [W, W],
  ]) {
    parts.push(new BoxGeometry(1.4, H, 1.4).translate(x, H / 2, z))
  }
  for (let y = 8; y < H; y += 14) {
    parts.push(new BoxGeometry(2 * W, 0.9, 0.9).translate(0, y, -W))
    parts.push(new BoxGeometry(2 * W, 0.9, 0.9).translate(0, y, W))
    parts.push(new BoxGeometry(0.9, 0.9, 2 * W).translate(-W, y, 0))
    parts.push(new BoxGeometry(0.9, 0.9, 2 * W).translate(W, y, 0))
    parts.push(new BoxGeometry(2 * W, 0.8, 0.8).translate(0, y + 7, -W).rotateZ(0.01))
  }
  parts.push(new BoxGeometry(34, 2.4, 3.2).translate(W + 16, 118, 0))
  parts.push(new BoxGeometry(30, 2.4, 3.2).translate(W + 14, 80, 0))
  parts.push(new BoxGeometry(4, 6, 4).translate(0, H + 3, 0))
  return mergeStatic(parts.map((g) => (g.index ? g : g)))
}

// Geometry for the lunar module and the surface props, built in code with vertex colors.
// Each builder returns one merged geometry. No React imports.
import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute } from 'three'
import { QuadBuilder, cbox, ccyl, cstrut, mergeColored, type P3 } from '../../procgen/coloredGeo'
import { createRng } from '../../procgen/rng'
import { FOOTPAD_DIST, FOOTPAD_RADIUS, STAGE_BOTTOM, STAGE_TOP } from './layout'

const FOIL = '#B8A06A'
const FOIL_HI = '#E8D494'
const FOIL_LO = '#7d6a40'
const GREY = '#a9a9a4'
const GREY_DARK = '#6e6e6a'
const SILVER = '#cfcfca'
const FOIL_BLACK = '#1b1813'
const STRUT = '#8c7a4a'

const OCT_R = 2.05

/** Descent stage: octagonal prism wrapped in crinkled foil, a dark underside, the engine bell. */
export function buildDescentBody(): BufferGeometry {
  const rng = createRng(41)
  const q = new QuadBuilder()
  const ring = (y: number): P3[] =>
    Array.from({ length: 8 }, (_, k) => {
      const a = ((k + 0.5) * Math.PI) / 4
      return [Math.sin(a) * OCT_R, y, Math.cos(a) * OCT_R] as P3
    })
  const lo = ring(STAGE_BOTTOM)
  const hi = ring(STAGE_TOP)
  const tone = (): string => {
    const r = rng()
    // Crinkled gold foil with patches of black Kapton.
    if (r > 0.86) return FOIL_BLACK
    const c = new Color(r < 0.18 ? FOIL_HI : r < 0.4 ? FOIL_LO : FOIL)
    return '#' + c.offsetHSL(0, 0, (rng() - 0.5) * 0.08).getHexString()
  }
  const NX = 6
  const NY = 4
  for (let k = 0; k < 8; k++) {
    const a0 = lo[k]
    const a1 = lo[(k + 1) % 8]
    const b0 = hi[k]
    const b1 = hi[(k + 1) % 8]
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const p = (u: number, v: number): P3 => {
          const x0 = a0[0] + (a1[0] - a0[0]) * u
          const z0 = a0[2] + (a1[2] - a0[2]) * u
          return [x0 + (b0[0] - a0[0]) * v * (1 - u) + (b1[0] - a1[0]) * v * u, STAGE_BOTTOM + (STAGE_TOP - STAGE_BOTTOM) * v, z0 + (b0[2] - a0[2]) * v * (1 - u) + (b1[2] - a1[2]) * v * u]
        }
        q.quad(p(i / NX, j / NY), p((i + 1) / NX, j / NY), p((i + 1) / NX, (j + 1) / NY), p(i / NX, (j + 1) / NY), 0, 0, 1, 1, tone())
      }
    }
  }
  // Raised foil panels with dark edging on every face: one black, one bright gold.
  const at = (k: number, u: number, v: number, out: number): P3 => {
    const a0 = lo[k]
    const a1 = lo[(k + 1) % 8]
    const b0 = hi[k]
    const b1 = hi[(k + 1) % 8]
    const bx = a0[0] + (a1[0] - a0[0]) * u
    const bz = a0[2] + (a1[2] - a0[2]) * u
    const tx = b0[0] + (b1[0] - b0[0]) * u
    const tz = b0[2] + (b1[2] - b0[2]) * u
    const ang = ((k + 1) * Math.PI) / 4
    return [bx + (tx - bx) * v + Math.sin(ang) * out, STAGE_BOTTOM + (STAGE_TOP - STAGE_BOTTOM) * v, bz + (tz - bz) * v + Math.cos(ang) * out]
  }
  for (let k = 0; k < 8; k++) {
    const panel = (u0: number, u1: number, v0: number, v1: number, out: number, c: string): void =>
      q.quad(at(k, u0, v0, out), at(k, u1, v0, out), at(k, u1, v1, out), at(k, u0, v1, out), 0, 0, 1, 1, c)
    panel(0.08, 0.46, 0.12, 0.88, 0.05, '#2a261e')
    panel(0.1, 0.44, 0.16, 0.84, 0.07, k % 2 ? FOIL_BLACK : FOIL_HI)
    panel(0.54, 0.92, 0.12, 0.88, 0.05, '#2a261e')
    panel(0.56, 0.9, 0.16, 0.84, 0.07, k % 2 ? FOIL_HI : '#3a3224')
    // Horizontal tape bands.
    panel(0, 1, 0.47, 0.5, 0.03, '#d8c98c')
  }
  q.fan([0, STAGE_TOP, 0], hi.slice().reverse(), '#8a8a84')
  q.fan([0, STAGE_BOTTOM, 0], lo, '#2a2a28')
  const body = q.build()
  const bell = new ConeGeometry(0.55, 0.8, 8, 1, true)
  bell.translate(0, STAGE_BOTTOM - 0.4, 0)
  const bellPaint = new Float32BufferAttribute(new Float32Array(bell.attributes.position.count * 3).fill(0.18), 3)
  bell.setAttribute('color', bellPaint)
  return mergeColored([body, bell])
}

/** Four splayed legs, footpads, the ladder, the porch and the equipment bay panel. */
export function buildLegs(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const dirs: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]
  for (const [dx, dz] of dirs) {
    const top: P3 = [dx * 1.9, 2.1, dz * 1.9]
    const foot: P3 = [dx * FOOTPAD_DIST, 0.25, dz * FOOTPAD_DIST]
    parts.push(cstrut(top, foot, 0.1, STRUT))
    parts.push(cstrut([dx * 1.9, 1.2, dz * 1.9], [dx * (FOOTPAD_DIST - 0.4), 0.35, dz * (FOOTPAD_DIST - 0.4)], 0.06, STRUT))
    parts.push(ccyl(FOOTPAD_RADIUS, 0.14, '#b09a62', dx * FOOTPAD_DIST, 0.07, dz * FOOTPAD_DIST, 'y', 10))
    // Footpad rim and the contact probe sticking out from the pad.
    parts.push(ccyl(FOOTPAD_RADIUS * 1.05, 0.04, '#7d6a40', dx * FOOTPAD_DIST, 0.16, dz * FOOTPAD_DIST, 'y', 10))
    if (dx !== 0 || dz < 0) {
      const out: P3 = [dx * (FOOTPAD_DIST + 1.5), 0.55, dz * (FOOTPAD_DIST + 1.5)]
      parts.push(cstrut([dx * FOOTPAD_DIST, 0.2, dz * FOOTPAD_DIST], out, 0.018, '#d8d8d4'))
      parts.push(cbox(0.06, 0.06, 0.06, '#d8d8d4', out[0], out[1], out[2]))
    }
  }
  // Cross braces between the legs.
  for (const [a, b] of [[0, 2], [2, 1], [1, 3], [3, 0]]) {
    const pa: P3 = [dirs[a][0] * 1.9, 1.5, dirs[a][1] * 1.9]
    const pb: P3 = [dirs[b][0] * 1.9, 1.5, dirs[b][1] * 1.9]
    parts.push(cstrut(pa, pb, 0.04, '#6e6040'))
  }
  // Ladder on the front leg.
  const top: P3 = [0, 1.75, 1.95]
  const bot: P3 = [0, 0.15, 4.25]
  for (const sx of [-0.22, 0.22]) parts.push(cstrut([sx, top[1], top[2]], [sx, bot[1], bot[2]], 0.06, '#c9b57a'))
  for (let i = 0; i <= 7; i++) {
    const f = i / 7
    const y = top[1] + (bot[1] - top[1]) * f
    const z = top[2] + (bot[2] - top[2]) * f
    parts.push(cbox(0.5, 0.04, 0.07, '#c9b57a', 0, y, z))
  }
  for (const sx of [-0.25, 0.25]) parts.push(cstrut([sx, 1.95, 2.05], [sx, 2.0, 2.7], 0.03, '#d8d8d4'))
  parts.push(cbox(1.0, 0.06, 0.95, '#a9a9a4', 0, 1.55, 2.4))
  parts.push(cbox(1.0, 0.03, 0.03, '#d8d8d4', 0, 2.0, 2.7))
  parts.push(cbox(1.15, 0.9, 0.28, '#5b5b58', -1.05, 1.65, 2.0))
  return mergeColored(parts)
}

/** Ascent stage: grey and silver angular cabin, triangular windows, antennas and thrusters. Origin at its base. */
export function buildAscent(): BufferGeometry {
  const q = new QuadBuilder()
  const R = 1.45
  const ring = (y: number, r: number): P3[] =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (k * Math.PI) / 3
      return [Math.sin(a) * r, y, Math.cos(a) * r] as P3
    })
  const lo = ring(STAGE_TOP, R)
  const hi = ring(4.75, R * 0.82)
  for (let k = 0; k < 6; k++) {
    q.quad(lo[k], lo[(k + 1) % 6], hi[(k + 1) % 6], hi[k], 0, 0, 1, 1, k % 2 ? GREY : SILVER)
  }
  q.fan([0, 4.75, 0], hi.slice().reverse(), GREY_DARK)
  // Front is +z. Two triangular windows set into the two front faces, each with a silver frame.
  const onFace = (k: number, u: number, v: number, out: number): P3 => {
    const a0 = lo[k]
    const a1 = lo[(k + 1) % 6]
    const b0 = hi[k]
    const b1 = hi[(k + 1) % 6]
    const bx = a0[0] + (a1[0] - a0[0]) * u
    const bz = a0[2] + (a1[2] - a0[2]) * u
    const tx = b0[0] + (b1[0] - b0[0]) * u
    const tz = b0[2] + (b1[2] - b0[2]) * u
    const ang = ((k + 0.5) * Math.PI) / 3
    return [bx + (tx - bx) * v + Math.sin(ang) * out, STAGE_TOP + (4.75 - STAGE_TOP) * v, bz + (tz - bz) * v + Math.cos(ang) * out]
  }
  for (const k of [5, 0]) {
    const flip = k === 5
    // Triangle pointing down toward the middle of the front.
    const tri = (out: number, grow: number): P3[] => [
      onFace(k, flip ? 0.12 - grow : 0.12 - grow, 0.72 + grow, out),
      onFace(k, 0.9 + grow, 0.72 + grow, out),
      onFace(k, flip ? 0.9 : 0.12, 0.3 - grow, out),
    ]
    q.fan(onFace(k, 0.5, 0.58, 0.015), tri(0.015, 0.06), '#d8d8d4')
    q.fan(onFace(k, 0.5, 0.58, 0.03), tri(0.03, 0), '#0b1016')
  }
  // Docking target on top: a ring, a dark centre and a cross.
  q.fan([0, 4.76, 0.2], Array.from({ length: 10 }, (_, k) => [Math.sin((k * Math.PI) / 5) * 0.5, 4.76, 0.2 + Math.cos((k * Math.PI) / 5) * 0.5] as P3).reverse(), '#a9a9a4')
  const parts: BufferGeometry[] = [q.build()]
  // Thruster quads and antennas.
  for (const [x, z] of [
    [1.5, 0.9],
    [-1.5, 0.9],
    [1.5, -0.9],
    [-1.5, -0.9],
  ]) parts.push(cbox(0.3, 0.3, 0.3, SILVER, x, 3.9, z))
  parts.push(cstrut([0.4, 4.7, -0.3], [0.9, 5.5, -0.5], 0.04, '#d8d8d4'))
  parts.push(cstrut([-0.4, 4.7, -0.3], [-1.1, 5.3, -0.2], 0.04, '#d8d8d4'))
  parts.push(ccyl(0.28, 0.06, SILVER, 0.9, 5.5, -0.5, 'y', 8))
  parts.push(cbox(0.9, 0.12, 0.5, '#3a3a38', 0, 3.2, 1.45))
  // Docking target: raised ring, dark disc and cross hairs.
  parts.push(ccyl(0.38, 0.07, '#cfcfca', 0, 4.8, 0.2, 'y', 10))
  parts.push(ccyl(0.22, 0.09, '#1a1a18', 0, 4.8, 0.2, 'y', 10))
  parts.push(cbox(0.6, 0.02, 0.04, '#e8e6de', 0, 4.86, 0.2))
  parts.push(cbox(0.04, 0.02, 0.6, '#e8e6de', 0, 4.86, 0.2))
  // Steerable dish on a mast, and the VHF antenna rods.
  parts.push(cstrut([-0.7, 4.7, -0.9], [-0.7, 5.25, -1.0], 0.035, '#d8d8d4'))
  parts.push(ccyl(0.38, 0.05, '#e8e6de', -0.7, 5.3, -1.0, 'z', 10))
  parts.push(cstrut([0.2, 4.74, -0.7], [0.2, 5.9, -0.7], 0.012, '#d8d8d4'))
  // Forward hatch and its landing light panel.
  parts.push(cbox(0.55, 0.6, 0.05, '#8c8c88', 0, 3.4, 1.3))
  parts.push(cbox(0.4, 0.45, 0.02, '#bdbdb8', 0, 3.4, 1.34))
  // RCS quad struts.
  for (const [x, z] of [[1.5, 0.9], [-1.5, 0.9], [1.5, -0.9], [-1.5, -0.9]]) parts.push(cstrut([x * 0.82, 3.9, z * 0.82], [x, 3.9, z], 0.03, '#8c8c88'))
  return mergeColored(parts)
}

/**
 * The flag: a vertical pole with a horizontal top bar, and a stiff cloth hanging from the bar.
 * The cloth is 0.9 m by 0.6 m, blue, with a white and blue Earth disc in the middle.
 * Origin at the base of the pole; the bar and cloth run along +x.
 */
export const FLAG_POLE_HEIGHT = 2
export const FLAG_CLOTH = { w: 0.9, h: 0.6 }
export function buildFlag(): BufferGeometry {
  const top = FLAG_POLE_HEIGHT
  const cx = FLAG_CLOTH.w / 2 + 0.03
  const cy = top - 0.03 - FLAG_CLOTH.h / 2
  return mergeColored([
    ccyl(0.025, top, '#d8d8d4', 0, top / 2, 0, 'y', 6),
    cbox(FLAG_CLOTH.w + 0.06, 0.03, 0.03, '#d8d8d4', cx, top, 0),
    cbox(FLAG_CLOTH.w, FLAG_CLOTH.h, 0.012, '#2F5F8F', cx, cy, 0),
    ccyl(0.17, 0.016, '#f2f4f6', cx, cy, 0.004, 'z', 12),
    ccyl(0.11, 0.02, '#4f7fb5', cx - 0.01, cy, 0.006, 'z', 10),
  ])
}

/** The rolled flag kit, leaning by the ladder. Origin at its centre. */
export function buildFlagKit(): BufferGeometry {
  return mergeColored([ccyl(0.07, 0.8, '#2F5F8F', 0, 0, 0, 'y', 6), ccyl(0.02, 1.2, '#d8d8d4', 0.09, 0.2, 0, 'y', 4)])
}

export function buildScoop(): BufferGeometry {
  return mergeColored([cbox(0.14, 0.04, 0.2, '#c9c9c4', 0, 0, 0.18), cbox(0.03, 0.03, 0.45, '#8c8c88', 0, 0, -0.05)])
}

export function buildBag(): BufferGeometry {
  return mergeColored([cbox(0.28, 0.1, 0.2, '#e8e6de', 0, 0.05, 0), cbox(0.08, 0.05, 0.04, '#E2782F', 0.1, 0.12, 0)])
}

/** The seismometer package with two solar panels and an antenna. Origin at its base. */
export function buildSeismo(): BufferGeometry {
  return mergeColored([
    cbox(0.4, 0.28, 0.4, FOIL, 0, 0.14, 0),
    cbox(0.5, 0.02, 0.34, '#1c2a4a', 0.46, 0.3, 0),
    cbox(0.5, 0.02, 0.34, '#1c2a4a', -0.46, 0.3, 0),
    cstrut([0, 0.28, 0], [0.05, 0.75, 0], 0.015, '#d8d8d4'),
  ])
}

/** A gloved hand and wrist cuff holding a carried item. Origin at the grip, fingers toward -z. */
export function buildGlove(): BufferGeometry {
  return mergeColored([
    cbox(0.05, 0.04, 0.07, '#e4dfd0', 0, 0, -0.01),
    cbox(0.03, 0.025, 0.04, '#d8d3c4', 0, 0.005, -0.06),
    ccyl(0.03, 0.05, '#9a9588', 0.0, -0.01, 0.045, 'z', 8),
    cbox(0.05, 0.05, 0.14, '#e4dfd0', 0.0, -0.035, 0.12),
  ])
}

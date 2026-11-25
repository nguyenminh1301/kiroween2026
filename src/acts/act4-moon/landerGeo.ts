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
const BLACK = '#101010'
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
    const c = new Color(r < 0.18 ? FOIL_HI : r < 0.4 ? FOIL_LO : FOIL)
    return '#' + c.offsetHSL(0, 0, (rng() - 0.5) * 0.08).getHexString()
  }
  const NX = 4
  const NY = 3
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
    parts.push(ccyl(FOOTPAD_RADIUS, 0.14, '#b09a62', dx * FOOTPAD_DIST, 0.07, dz * FOOTPAD_DIST, 'y', 8))
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
  parts.push(cbox(1.0, 0.06, 0.95, '#a9a9a4', 0, 1.55, 2.4))
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
  // Front is +z. Two triangular windows.
  q.fan([-0.55, 4.2, 1.2], [[-0.85, 4.35, 1.2], [-0.25, 4.45, 1.2], [-0.5, 3.95, 1.2]], BLACK)
  q.fan([0.55, 4.2, 1.2], [[0.85, 4.35, 1.2], [0.25, 4.45, 1.2], [0.5, 3.95, 1.2]], BLACK)
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
  return mergeColored(parts)
}

/** The flag: a pole and a stiff flag showing the Earth. Origin at the base of the pole. */
export function buildFlag(): BufferGeometry {
  return mergeColored([
    ccyl(0.025, 2.1, '#d8d8d4', 0, 1.05, 0, 'y', 6),
    cbox(0.8, 0.03, 0.03, '#d8d8d4', 0.4, 1.95, 0),
    cbox(0.8, 0.52, 0.02, '#2F5F8F', 0.4, 1.68, 0),
    cbox(0.26, 0.26, 0.025, '#e8eef2', 0.4, 1.68, 0),
    cbox(0.14, 0.2, 0.03, '#4f7fb5', 0.36, 1.7, 0),
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

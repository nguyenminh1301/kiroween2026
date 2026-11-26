// The five command module windows and the one outside world they look into.
// Each window is a quad lying flat on the shell. A pixel of its view shows what lies in the direction from the
// crew's eye through that pixel, so every window shows the same world: the Earth, the stars and the sky sit at
// fixed directions around the spacecraft. Pure: no Three.js or React imports.
import type { Vec3 } from '../../types'
import { wallRadius } from './cabinGeo'
import { EYE, SHELL_SIDES } from './layout'

export type WindowKey = 'hatch' | 'left' | 'right' | 'rdvLeft' | 'rdvRight'

export interface WindowDef {
  key: WindowKey
  /** Centre of the opening, spacecraft frame (x right, y up, -z forward). */
  center: Vec3
  /** Quad axes: x right, y up, z the way the quad faces (into the cabin). */
  x: Vec3
  y: Vec3
  z: Vec3
  w: number
  h: number
  round: boolean
}

const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k })
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const norm = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a.x, a.y, a.z))

/** Lift off the wall so the view never fights the shell. */
const LIFT = 0.006

/** A window lying on shell face `face` (0 to 9, centre at 18 + 36 face degrees from forward) at height `y`. */
function shellWindow(key: WindowKey, face: number, y: number, w: number, h: number): WindowDef {
  const theta = ((face + 0.5) * 2 * Math.PI) / SHELL_SIDES
  const out: Vec3 = { x: Math.sin(theta), y: 0, z: -Math.cos(theta) }
  const apothem = (yy: number): number => wallRadius(yy) * Math.cos(Math.PI / SHELL_SIDES)
  const slope = (apothem(y + 0.01) - apothem(y - 0.01)) / 0.02
  // Wall plane: out . p - slope * y = const. Its inward normal faces the crew, and tilts down.
  const inward = norm({ x: -out.x, y: slope, z: -out.z })
  const up = norm({ x: slope * out.x, y: 1, z: slope * out.z })
  const right = norm(cross(up, inward))
  const onWall = add(scale(out, apothem(y)), { x: 0, y, z: 0 })
  return { key, center: add(onWall, scale(inward, LIFT)), x: right, y: up, z: inward, w, h, round: false }
}

export function windowDefs(): WindowDef[] {
  return [
    {
      key: 'hatch',
      center: { x: 0, y: 2.57, z: 0 },
      x: { x: 1, y: 0, z: 0 },
      y: { x: 0, y: 0, z: 1 },
      z: { x: 0, y: -1, z: 0 },
      w: 0.84,
      h: 0.84,
      round: true,
    },
    shellWindow('right', 2, 1.2, 0.8, 0.6),
    shellWindow('left', 7, 1.2, 0.8, 0.6),
    // The two small forward facing rendezvous windows: the faces either side of straight ahead.
    shellWindow('rdvRight', 0, 1.95, 0.34, 0.34),
    shellWindow('rdvLeft', 9, 1.95, 0.34, 0.34),
  ]
}

/** Unit direction from the eye through texel (px, py) of a `tw` by `th` view of `win`. py counts from the top. */
export function texelDirection(win: WindowDef, tw: number, th: number, px: number, py: number, eye: Vec3 = EYE): Vec3 {
  const lx = ((px + 0.5) / tw - 0.5) * win.w
  const ly = (0.5 - (py + 0.5) / th) * win.h
  const p = add(win.center, add(scale(win.x, lx), scale(win.y, ly)))
  return norm({ x: p.x - eye.x, y: p.y - eye.y, z: p.z - eye.z })
}

/** All texel directions of a window view, row by row from the top, three floats each. */
export function viewDirections(win: WindowDef, tw: number, th: number, eye: Vec3 = EYE): Float32Array {
  const out = new Float32Array(tw * th * 3)
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const d = texelDirection(win, tw, th, x, y, eye)
      const i = (y * tw + x) * 3
      out[i] = d.x
      out[i + 1] = d.y
      out[i + 2] = d.z
    }
  }
  return out
}

// The Earth sits off the right side of the spacecraft, a little ahead of the beam: the right window is the only
// one that looks that way.
const EARTH_AZIMUTH = (11 * Math.PI) / 180
export const EARTH_DIR: Vec3 = norm({ x: Math.cos(EARTH_AZIMUTH), y: 0.03, z: -Math.sin(EARTH_AZIMUTH) })
export const EARTH_RADIUS = 0.1
const EARTH_RIGHT = norm(cross(EARTH_DIR, { x: 0, y: 1, z: 0 }))
const EARTH_UP = cross(EARTH_RIGHT, EARTH_DIR)

/** Position inside the Earth disc as (a, b) in -1..1 (b up), or null when `dir` misses it. */
export function earthDisc(dir: Vec3): { a: number; b: number } | null {
  if (dot(dir, EARTH_DIR) <= 0) return null
  const a = dot(dir, EARTH_RIGHT) / EARTH_RADIUS
  const b = dot(dir, EARTH_UP) / EARTH_RADIUS
  return a * a + b * b <= 1 ? { a, b } : null
}

const hash2 = (a: number, b: number): number => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Star brightness 0 to 1 in direction `dir`. The same direction always gives the same star. */
export function starAt(dir: Vec3): number {
  const az = Math.atan2(dir.x, -dir.z)
  const el = Math.asin(Math.min(1, Math.max(-1, dir.y)))
  const h = hash2(Math.round(az * 150), Math.round(el * 150))
  return h > 0.992 ? 0.55 + 0.45 * hash2(Math.round(az * 150) + 7, Math.round(el * 150)) : 0
}

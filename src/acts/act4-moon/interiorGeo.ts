// The ascent stage cabin: floor, six walls (two with window openings), ceiling, instrument panels and lights.
// Built in code with vertex colors, one merged geometry. No React imports.
import type { BufferGeometry } from 'three'
import { QuadBuilder, cstrut, mergeColored, type P3 } from '../../procgen/coloredGeo'
import { createRng } from '../../procgen/rng'
import { HULL_TOP, LM_FLOOR, PANEL_FACES, WALL_INSET, WINDOW_BOX, WINDOW_FACES, faceAt } from './layout'

const WALL = '#cfc8b6'
const WALL_DARK = '#a79f8a'
const FLOOR = '#7a7464'
const PANEL = '#2b2a26'

const p3 = (v: { x: number; y: number; z: number }): P3 => [v.x, v.y, v.z]

/** Where the pencil, cue cards, pouch and camera hang. Used by the scene for the prop meshes. */
export const PROP_SPOTS = {
  card: { face: 3, u: 0.2, v: 0.72, out: -0.05 },
  card2: { face: 2, u: 0.8, v: 0.7, out: -0.05 },
  pencil: { face: 3, u: 0.8, v: 0.5, out: -0.06 },
  pouch: { face: 2, u: 0.5, v: 0.12, out: -0.08 },
  camera: { face: 4, u: 0.5, v: 0.4, out: -0.1 },
} as const

export function buildInterior(): BufferGeometry {
  const q = new QuadBuilder()
  const rng = createRng(12)
  const face = (k: number, u0: number, v0: number, u1: number, v1: number, color: string, out = 0): void => {
    q.quad(p3(faceAt(k, u0, v0, out)), p3(faceAt(k, u1, v0, out)), p3(faceAt(k, u1, v1, out)), p3(faceAt(k, u0, v1, out)), 0, 0, 1, 1, color)
  }
  for (let k = 0; k < 6; k++) {
    if ((WINDOW_FACES as readonly number[]).includes(k)) {
      const w = WINDOW_BOX
      face(k, 0, 0, 1, w.v0, WALL)
      face(k, 0, w.v1, 1, 1, WALL)
      face(k, 0, w.v0, w.u0, w.v1, WALL)
      face(k, w.u1, w.v0, 1, w.v1, WALL)
      // Silver window frame, a thin strip on the opening's edge.
      face(k, w.u0, w.v0, w.u1, w.v0 + 0.04, '#d8d8d4', 0.01)
      face(k, w.u0, w.v1 - 0.04, w.u1, w.v1, '#d8d8d4', 0.01)
      face(k, w.u0, w.v0, w.u0 + 0.03, w.v1, '#d8d8d4', 0.01)
      face(k, w.u1 - 0.03, w.v0, w.u1, w.v1, '#d8d8d4', 0.01)
    } else {
      face(k, 0, 0, 1, 1, k % 2 ? WALL : WALL_DARK)
    }
  }
  // Floor and ceiling.
  const ringAt = (y: number, r: number): P3[] =>
    Array.from({ length: 6 }, (_, k) => [Math.sin((k * Math.PI) / 3) * r, y, Math.cos((k * Math.PI) / 3) * r] as P3)
  q.fan([0, LM_FLOOR + 0.02, 0], ringAt(LM_FLOOR + 0.02, 1.4).reverse(), FLOOR)
  q.fan([0, HULL_TOP - WALL_INSET, 0], ringAt(HULL_TOP - WALL_INSET, 1.18), WALL_DARK)
  // Instrument panels on the rear faces: dark slab, rows of lights and switches, a green readout window.
  const lights = ['#e9c27a', '#e2782f', '#7fd18a', '#f2ebdd', '#c0463a']
  for (const k of PANEL_FACES) {
    face(k, 0.08, 0.22, 0.92, 0.86, PANEL, -0.012)
    face(k, 0.14, 0.58, 0.46, 0.8, '#1b3a2a', -0.02)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        const u = 0.14 + col * 0.085
        const v = 0.27 + row * 0.07
        face(k, u, v, u + 0.04, v + 0.03, lights[Math.floor(rng() * lights.length)], -0.024)
      }
    }
    for (let col = 0; col < 5; col++) {
      const u = 0.52 + col * 0.075
      face(k, u, 0.62, u + 0.025, 0.78, '#b9b19a', -0.03)
    }
  }
  const parts: BufferGeometry[] = [q.build()]
  // The string the pencil hangs on, from the panel edge.
  const a = faceAt(PROP_SPOTS.pencil.face, PROP_SPOTS.pencil.u, PROP_SPOTS.pencil.v + 0.12, -0.04)
  const b = faceAt(PROP_SPOTS.pencil.face, PROP_SPOTS.pencil.u, PROP_SPOTS.pencil.v, -0.06)
  parts.push(cstrut([a.x, a.y, a.z], [b.x, b.y, b.z], 0.004, '#f2ebdd'))
  return mergeColored(parts)
}

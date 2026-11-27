// The console: seven panels in an arc, built as two merged vertex-color geometries
// (body and lamps). Parts are made in panel-local space and skipped near the three fixed spots.
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../../procgen/rng'
import {
  DSKY_POS,
  O2_POS,
  CONSOLE_SCALE,
  PANEL_CENTER_Y,
  PANEL_CENTER_Z,
  PANEL_COUNT,
  PANEL_H,
  PANEL_RADIUS,
  PANEL_STEP,
  PANEL_TILT,
  PANEL_W,
  SWITCH_POS,
} from './layout'

/** Panel index 0 to 6, with 3 the middle one. */
export const MIDDLE = 3

export function panelAngle(i: number): number {
  return (i - MIDDLE) * PANEL_STEP
}

/** World transform of panel `i`: translate, then yaw toward the couches, then tilt back, then scale to world size. */
export function panelMatrix(i: number): Matrix4 {
  const a = panelAngle(i)
  const r = PANEL_RADIUS * CONSOLE_SCALE
  const pivotZ = PANEL_CENTER_Z + r
  const pos = new Vector3(r * Math.sin(a), PANEL_CENTER_Y, pivotZ - r * Math.cos(a))
  const q = new Matrix4().makeRotationFromEuler(new Euler(-PANEL_TILT, -a, 0, 'YXZ'))
  const s = new Matrix4().makeScale(CONSOLE_SCALE, CONSOLE_SCALE, CONSOLE_SCALE)
  return new Matrix4().makeTranslation(pos.x, pos.y, pos.z).multiply(q).multiply(s)
}

export function panelEuler(i: number): Euler {
  return new Euler(-PANEL_TILT, -panelAngle(i), 0, 'YXZ')
}

/** A world point in the local space of panel `i`. */
export function toLocal(i: number, p: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(p.x, p.y, p.z).applyMatrix4(panelMatrix(i).invert())
}

/** The spots, as the panel that holds each one and the local position on it. */
export const SPOTS = {
  dsky: { panel: MIDDLE, radius: 0.13 },
  sw: { panel: MIDDLE + 1, radius: 0.08 },
  o2: { panel: MIDDLE - 1, radius: 0.09 },
}

/** Big dials and the alarm lamp on the middle panel, in local space. */
export const DIAL_LOCAL = [-0.14, 0, 0.14].map((x) => ({ x, y: 0.2 }))
export const DIAL_RADIUS = 0.06
export const ALARM_LOCAL = { x: 0, y: 0.33 }

const PANEL = '#34312a'
const RIM = '#6b665a'
const BLACK = '#14120e'
const CREAM = '#e6dfc8'
const TIP = '#d8d2bd'
const RED = '#a8321f'

export interface ConsoleGeometry {
  body: BufferGeometry
  lamps: BufferGeometry
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

function finish(g: BufferGeometry, m: Matrix4, color: string): BufferGeometry {
  g.applyMatrix4(m)
  g.deleteAttribute('uv')
  const out = g.index ? g.toNonIndexed() : g
  return paint(out, color)
}

export function buildConsole(): ConsoleGeometry {
  const body: BufferGeometry[] = []
  const lamps: BufferGeometry[] = []
  const spotLocal = [
    { ...toLocal(SPOTS.dsky.panel, DSKY_POS), ...SPOTS.dsky },
    { ...toLocal(SPOTS.sw.panel, SWITCH_POS), ...SPOTS.sw },
    { ...toLocal(SPOTS.o2.panel, O2_POS), ...SPOTS.o2 },
  ]

  for (let i = 0; i < PANEL_COUNT; i++) {
    const M = panelMatrix(i)
    const rng = createRng(100 + i)
    const clear = (x: number, y: number, r = 0.02): boolean =>
      spotLocal.every((s) => s.panel !== i || Math.hypot(x - s.x, y - s.y) > s.radius + r)
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, into = body, rotZ = 0): void => {
      const g = new BoxGeometry(w, h, d)
      if (rotZ) g.rotateZ(rotZ)
      g.translate(x, y, z)
      into.push(finish(g, M, color))
    }
    const disc = (r: number, h: number, x: number, y: number, z: number, color: string, sides = 8): void => {
      const g = new CylinderGeometry(r, r, h, sides, 1)
      g.rotateX(Math.PI / 2)
      g.translate(x, y, z)
      body.push(finish(g, M, color))
    }

    box(PANEL_W, PANEL_H, 0.03, 0, 0, 0, PANEL)
    box(PANEL_W, 0.02, 0.04, 0, PANEL_H / 2 - 0.01, 0.005, RIM)
    box(PANEL_W, 0.02, 0.04, 0, -PANEL_H / 2 + 0.01, 0.005, RIM)
    box(0.02, PANEL_H, 0.04, -PANEL_W / 2 + 0.01, 0, 0.005, RIM)
    box(0.02, PANEL_H, 0.04, PANEL_W / 2 - 0.01, 0, 0.005, RIM)

    const outer = i === 0 || i === PANEL_COUNT - 1
    if (outer) {
      // All breakers: a grid of dark housings with light tips, some pulled.
      for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 8; c++) {
          const x = -0.23 + c * 0.066
          const y = 0.32 - r * 0.056
          if (!clear(x, y)) continue
          box(0.036, 0.024, 0.03, x, y, 0.025, BLACK)
          box(0.022, 0.014, 0.022 + (rng() < 0.2 ? 0.018 : 0), x, y, 0.043, rng() < 0.3 ? RED : TIP)
        }
        box(0.5, 0.004, 0.006, 0, 0.345 - r * 0.056, 0.02, CREAM)
      }
      continue
    }

    // Instrument rows. Row y values keep clear of the dials and alarm lamp on the middle panel.
    for (let r = 0; r < 7; r++) {
      const y = 0.31 - r * 0.1
      if (i === MIDDLE && y > 0.1) continue
      box(0.5, 0.004, 0.006, 0, y + 0.045, 0.02, CREAM)
      for (let c = 0; c < 5; c++) {
        const x = -0.2 + c * 0.1 + (rng() - 0.5) * 0.02
        if (!clear(x, y, 0.03)) continue
        const kind = rng()
        if (kind < 0.35) {
          // Toggle: base and a slanted tip.
          box(0.03, 0.03, 0.02, x, y, 0.025, BLACK)
          box(0.012, 0.04, 0.012, x, y + 0.01, 0.045, TIP, body, (rng() - 0.5) * 0.7)
        } else if (kind < 0.6) {
          disc(0.032, 0.012, x, y, 0.025, CREAM, 8)
          box(0.006, 0.04, 0.006, x, y + 0.012, 0.035, BLACK, body, rng() * Math.PI * 2)
        } else if (kind < 0.8) {
          disc(0.022, 0.03, x, y, 0.03, BLACK, 6)
          box(0.006, 0.02, 0.006, x, y + 0.01, 0.047, CREAM, body, rng() * Math.PI * 2)
        } else {
          const tone = ['#e0a020', '#4cd060', '#d84a30', '#e8e4d0'][Math.floor(rng() * 4)]
          for (let k = 0; k < 3; k++) box(0.022, 0.016, 0.014, x - 0.03 + k * 0.03, y, 0.03, tone, lamps)
          box(0.09, 0.03, 0.014, x, y, 0.022, BLACK)
        }
      }
    }

    if (i === MIDDLE) {
      for (const d of DIAL_LOCAL) {
        disc(DIAL_RADIUS + 0.01, 0.012, d.x, d.y, 0.022, BLACK, 10)
        disc(DIAL_RADIUS, 0.012, d.x, d.y, 0.03, CREAM, 10)
        for (let k = 0; k < 7; k++) {
          const ang = -2.2 + k * 0.62
          box(0.005, 0.014, 0.004, d.x + Math.sin(ang) * 0.048, d.y + Math.cos(ang) * 0.048, 0.037, BLACK, body, -ang)
        }
      }
    }
  }

  // Fixed spots: DSKY bezel, switch guard and O2 gauge, placed in local space of their panels.
  {
    const place = (panel: number, p: { x: number; y: number; z: number }) => ({ M: panelMatrix(panel), l: toLocal(panel, p) })
    const d = place(SPOTS.dsky.panel, DSKY_POS)
    const g1 = new BoxGeometry(0.15, 0.185, 0.02)
    g1.translate(d.l.x, d.l.y, 0.02)
    body.push(finish(g1, d.M, '#55524a'))
    const s = place(SPOTS.sw.panel, SWITCH_POS)
    const g2 = new CylinderGeometry(0.05, 0.05, 0.02, 8, 1)
    g2.rotateX(Math.PI / 2)
    g2.translate(s.l.x, s.l.y, 0.025)
    body.push(finish(g2, s.M, '#4a463c'))
    const g3 = new BoxGeometry(0.1, 0.012, 0.03)
    g3.translate(s.l.x, s.l.y + 0.055, 0.035)
    body.push(finish(g3, s.M, RED))
    const o = place(SPOTS.o2.panel, O2_POS)
    const g4 = new CylinderGeometry(0.085, 0.085, 0.016, 12, 1)
    g4.rotateX(Math.PI / 2)
    g4.translate(o.l.x, o.l.y, 0.024)
    body.push(finish(g4, o.M, BLACK))
    const g5 = new CylinderGeometry(0.072, 0.072, 0.016, 12, 1)
    g5.rotateX(Math.PI / 2)
    g5.translate(o.l.x, o.l.y, 0.034)
    body.push(finish(g5, o.M, CREAM))
    // Red zone ticks and a needle pinned high.
    for (let k = 0; k < 5; k++) {
      const ang = 0.9 + k * 0.28
      const g = new BoxGeometry(0.008, 0.02, 0.006)
      g.rotateZ(-ang)
      g.translate(o.l.x + Math.sin(ang) * 0.056, o.l.y + Math.cos(ang) * 0.056, 0.045)
      body.push(finish(g, o.M, k >= 2 ? '#c8301c' : BLACK))
    }
    const needle = new BoxGeometry(0.008, 0.06, 0.006)
    needle.translate(0, 0.03, 0)
    needle.rotateZ(-1.6)
    needle.translate(o.l.x, o.l.y, 0.047)
    body.push(finish(needle, o.M, BLACK))
  }

  const merge = (list: BufferGeometry[]): BufferGeometry => {
    const m = mergeGeometries(list, false)
    list.forEach((g) => g.dispose())
    return m
  }
  return { body: merge(body), lamps: merge(lamps) }
}

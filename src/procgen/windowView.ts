// What a cabin window shows, painted into a small RGBA buffer that becomes the window's texture.
// Every texel is looked up by its world direction, so all windows show one outside world. The view is the
// window's own quad, so nothing in it can leave the frame.
// Pure pixels: no Three.js, no canvas.
import { earthSway, turnAboutY } from './cabin/spin'
import { earthDisc, starAt } from './cabin/windows'
import { drawEarthCloud } from './textures/earthCloud'
import type { PixelData } from './textures/helpers'

export type WindowMode = 'sky' | 'plasma' | 'sea'

export interface WindowViewState {
  mode: WindowMode
  /** Sky color, 0 to 255 per channel. */
  sky: readonly [number, number, number]
  /** Seconds, drives the streaks and the waves. */
  t: number
  /** Show the Earth disc. */
  earth: boolean
  /** Spacecraft yaw in radians. The stars drift by it. Default 0. */
  spin?: number
}

export interface WindowViewSpec {
  w: number
  h: number
  round: boolean
  /** The direction from the eye through each texel (3 floats, row by row from the top), see cabin/windows.ts. */
  dirs: Float32Array
  seed: number
  /** Only the Earth window shows the Earth. Default true. */
  earthWindow?: boolean
}

let earthPixels: PixelData | null = null

const hash = (a: number, b: number, seed: number): number => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const mix = (a: number, b: number, k: number): number => a + (b - a) * Math.min(1, Math.max(0, k))

function put(buf: Uint8Array, x: number, yTop: number, w: number, h: number, r: number, g: number, b: number): void {
  // DataTexture rows start at the bottom.
  const i = ((h - 1 - yTop) * w + x) * 4
  buf[i] = r
  buf[i + 1] = g
  buf[i + 2] = b
  buf[i + 3] = 255
}

/** Paints one frame of a window view into `buf` (w * h * 4 bytes). */
export function paintWindowView(buf: Uint8Array, spec: WindowViewSpec, st: WindowViewState): void {
  const { w, h, seed, dirs } = spec
  const [sr, sg, sb] = st.sky
  const dark = Math.min(1, Math.max(0, (0.45 * 255 * 3 - (sr + sg + sb)) / (0.3 * 255 * 3)))
  if (st.earth && !earthPixels) earthPixels = drawEarthCloud(3)
  const flick = Math.floor(st.t * 14)
  const sway = earthSway(st.t)
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1)
      let r = sr
      let g = sg
      let b = sb
      if (st.mode === 'plasma') {
        // Hot core to deep orange at the edges, with streaks racing past.
        const d = Math.hypot(u - 0.5, v - 0.5) * 1.5
        r = mix(255, 214, d)
        g = mix(226, 70, d)
        b = mix(150, 22, d)
        const speed = 1.5 + hash(x, 0, seed) * 3
        const phase = (v * 2.2 + st.t * speed + hash(x, 1, seed)) % 1
        if (phase < 0.16 && hash(x >> 1, 2, seed) > 0.4) {
          r = 255
          g = mix(g, 245, 0.7)
          b = mix(b, 210, 0.8)
        } else if (hash(x, y + flick, seed) > 0.93) {
          g = Math.min(255, g + 40)
          b = Math.min(255, b + 30)
        }
      } else if (st.mode === 'sea') {
        // The horizon is at elevation zero, so it lines up across windows.
        const elev = dirs[(y * w + x) * 3 + 1] + Math.sin(st.t * 0.5) * 0.01
        if (elev < 0) {
          const depth = Math.min(1, -elev * 5)
          r = mix(70, 28, depth)
          g = mix(120, 78, depth)
          b = mix(150, 112, depth)
          const wave = Math.sin(x * 0.7 + st.t * 2 + v * 14) + Math.sin(x * 0.31 - st.t * 1.3 + v * 7)
          if (wave > 1.5) {
            r = 215
            g = 232
            b = 240
          }
        } else {
          const haze = Math.max(0, 1 - elev * 6) * 0.25
          r = mix(sr, 225, haze)
          g = mix(sg, 232, haze)
          b = mix(sb, 238, haze)
        }
      } else if (dark > 0) {
        const star = starAt(turnAboutY({ x: dirs[(y * w + x) * 3], y: dirs[(y * w + x) * 3 + 1], z: dirs[(y * w + x) * 3 + 2] }, st.spin ?? 0))
        if (star > 0) {
          const s = 110 + star * 145
          r = mix(r, s, dark)
          g = mix(g, s, dark)
          b = mix(b, s, dark)
        }
      }
      if (st.earth && spec.earthWindow !== false && st.mode === 'sky' && earthPixels) {
        const i3 = (y * w + x) * 3
        const disc = earthDisc({ x: dirs[i3], y: dirs[i3 + 1], z: dirs[i3 + 2] }, sway)
        if (disc) {
          const dx = disc.a
          const dy = -disc.b
          const d2 = dx * dx + dy * dy
          const tx = Math.floor((dx * 0.5 + 0.5) * (earthPixels.width - 1))
          const ty = Math.floor((dy * 0.5 + 0.5) * (earthPixels.height - 1))
          const i = (ty * earthPixels.width + tx) * 4
          // Dim toward the limb and the night side.
          const shade = 0.55 + 0.45 * Math.min(1, Math.max(0, 1 - d2 * 0.7 - (dx + 0.2) * 0.25))
          r = earthPixels.data[i] * shade
          g = earthPixels.data[i + 1] * shade
          b = earthPixels.data[i + 2] * shade
        }
      }
      put(buf, x, y, w, h, r, g, b)
    }
  }
}

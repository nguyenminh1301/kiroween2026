import type { WebGLRenderer } from 'three'
import { adaptiveScaler } from './adaptiveScaler'
import { lookupLevel } from './levelTable'
import { smoothEma, type RenderStats } from './stats'

let renderer: WebGLRenderer | null = null
let frameMs: number | null = null

export function attachRenderer(gl: WebGLRenderer | null): void {
  renderer = gl
}

/** Record one measured frame time in milliseconds. */
export function recordFrame(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return
  frameMs = smoothEma(frameMs, ms)
}

export function resetFrameStats(): void {
  frameMs = null
}

/** Live view: every read returns the latest numbers. */
export function getRenderStats(): RenderStats {
  return {
    get frameMs() {
      return frameMs ?? 0
    },
    get calls() {
      return renderer?.info.render.calls ?? 0
    },
    get triangles() {
      return renderer?.info.render.triangles ?? 0
    },
    get internalWidth() {
      return renderer?.domElement.width ?? lookupLevel(adaptiveScaler.getLevel()).width
    },
    get internalHeight() {
      return renderer?.domElement.height ?? lookupLevel(adaptiveScaler.getLevel()).height
    },
    get level() {
      return adaptiveScaler.getLevel()
    },
  }
}

import { Vector2, type Material } from 'three'
import { DEFAULT_LEVEL, lookupLevel } from './levelTable'

/** GLSL injected after the built-in projection. Mirrors snapVertex in snap.ts. */
export const SNAP_GLSL = `
  if (gl_Position.w > 0.0) {
    vec2 snapHalf = uSnapRes * 0.5;
    vec2 snapNdc = gl_Position.xy / gl_Position.w;
    snapNdc = floor(snapNdc * snapHalf + 0.5) / snapHalf;
    gl_Position.xy = snapNdc * gl_Position.w;
  }
`

const shared = { value: new Vector2(lookupLevel(DEFAULT_LEVEL).width, lookupLevel(DEFAULT_LEVEL).height) }
const patched = new Set<Material>()

export interface SnapPatch {
  apply(material: Material): void
  setResolution(resX: number, resY: number): void
  remove(material: Material): void
  patchedCount(): number
}

export const snapPatch: SnapPatch = {
  apply(material) {
    if (patched.has(material)) return
    patched.add(material)
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uSnapRes = shared
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'uniform vec2 uSnapRes;\nvoid main() {')
        .replace('#include <project_vertex>', `#include <project_vertex>\n${SNAP_GLSL}`)
    }
    material.customProgramCacheKey = () => `ps1-snap-${shared.value.x}x${shared.value.y}`
  },
  setResolution(resX, resY) {
    if (!(resX > 0) || !(resY > 0)) return
    shared.value.set(resX, resY)
  },
  remove(material) {
    patched.delete(material)
  },
  patchedCount() {
    return patched.size
  },
}

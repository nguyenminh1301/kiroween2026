import { Color, Fog, type Scene, type WebGLRenderer } from 'three'
import { isValidFogSpec, type FogSpec } from './fogSpec'

let warned = false

/** Sets linear fog and the matching clear colour. Invalid specs are ignored. */
export function applyFog(scene: Scene, renderer: WebGLRenderer, spec: FogSpec): boolean {
  if (!isValidFogSpec(spec)) {
    if (!warned) {
      warned = true
      console.error('applyFog: rejected fog spec', spec)
    }
    return false
  }
  const color = new Color(spec.color)
  scene.fog = new Fog(color, spec.near, spec.far)
  renderer.setClearColor(color)
  return true
}

export function clearFog(scene: Scene, renderer: WebGLRenderer): void {
  scene.fog = null
  renderer.setClearColor(0x000000)
}

export function resetFogWarning(): void {
  warned = false
}

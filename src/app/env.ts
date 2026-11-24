import type { Env } from './flow'

function hasWebgl2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

let webgl2: boolean | null = null

/** Reads the browser. WebGL2 is probed once. */
export function readEnv(): Env {
  webgl2 ??= hasWebgl2()
  let pointerFine = true
  try {
    pointerFine = window.matchMedia('(pointer: fine)').matches
  } catch {
    pointerFine = true
  }
  return { pointerFine, width: window.innerWidth, webgl2 }
}

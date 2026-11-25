// The live director numbers for `window.__los.director`. Plain module state, set by the act 3 runtime.
export interface DirectorSnapshot {
  state: { phase: string; alert: string; gap: number }
  noise: number
  threshold: number
  monster: { pos: { x: number; y: number; z: number }; mode: string }
}

let snap: (() => DirectorSnapshot) | null = null

export function setDirectorSource(fn: (() => DirectorSnapshot) | null): void {
  snap = fn
}

export const getDirector = (): DirectorSnapshot | null => (snap ? snap() : null)

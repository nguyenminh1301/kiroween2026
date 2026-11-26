// Mutable act 2 state read by the scene. Plain object, never React state.
// `cmFar` changes once, when the tunnel grows, and the scene rebuilds on that change only.
import { CM_FAR_START } from './layout'
import { createRepairs, type Repairs } from './repairs'

export const act2State = {
  cmFar: CM_FAR_START,
  inBag: false,
  repairs: createRepairs() as Repairs,
  /** Hose shake from the last tap, 1 down to 0. */
  tapKick: 0,
}

const listeners = new Set<() => void>()

export function setCmFar(v: number): void {
  act2State.cmFar = v
  for (const l of [...listeners]) l()
}

export function subscribeCmFar(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const getCmFar = (): number => act2State.cmFar

export function resetAct2State(): void {
  act2State.inBag = false
  act2State.repairs = createRepairs()
  act2State.tapKick = 0
  setCmFar(CM_FAR_START)
}

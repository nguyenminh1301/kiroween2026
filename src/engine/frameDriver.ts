import { gameStore } from './store'

export const MAX_DT = 0.05

export type SystemFn = (dt: number, t: number) => void

export interface RegisterOptions {
  pausable?: boolean
}

interface SystemHandle {
  name: string
  priority: number
  order: number
  fn: SystemFn
  pausable: boolean
  active: boolean
}

export interface FrameDriver {
  register(name: string, priority: number, fn: SystemFn, opts?: RegisterOptions): () => void
  step(rawDt: number): void
  getGameTime(): number
  systemCount(): number
}

export function createFrameDriver(getPaused: () => boolean): FrameDriver {
  let handles: SystemHandle[] = []
  let nextOrder = 0
  let gameTime = 0

  return {
    register(name, priority, fn, opts) {
      const handle: SystemHandle = {
        name,
        priority,
        order: nextOrder++,
        fn,
        pausable: opts?.pausable ?? true,
        active: true,
      }
      // Insert after every handle that sorts before or equal (order is monotonic).
      const next = handles.slice()
      let i = next.length
      while (i > 0 && next[i - 1].priority > priority) i--
      next.splice(i, 0, handle)
      handles = next
      return () => {
        if (!handle.active) return
        handle.active = false
        handles = handles.filter((h) => h !== handle)
      }
    },

    step(rawDt) {
      const dt = Math.min(Number.isFinite(rawDt) ? Math.max(rawDt, 0) : 0, MAX_DT)
      const paused = getPaused()
      if (!paused) gameTime += dt
      // `handles` is replaced (never mutated) on register/unregister, so this
      // reference is a stable snapshot for the whole frame.
      const snapshot = handles
      for (const h of snapshot) {
        if (!h.active) continue
        if (paused && h.pausable) continue
        h.fn(dt, gameTime)
      }
    },

    getGameTime() {
      return gameTime
    },

    systemCount() {
      return handles.length
    },
  }
}

/** The one driver the app runs. FrameDriver.tsx steps it from a single useFrame. */
export const frameDriver: FrameDriver = createFrameDriver(() => gameStore.getState().paused)

export function registerSystem(
  name: string,
  priority: number,
  fn: SystemFn,
  opts?: RegisterOptions,
): () => void {
  return frameDriver.register(name, priority, fn, opts)
}

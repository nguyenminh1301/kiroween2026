export type CleanupFn = () => void

export interface CleanupRegistry {
  /** Add a cleanup to run when the act unloads. */
  register(fn: CleanupFn): void
  /** Run every cleanup once, newest first, then clear. A throwing cleanup is logged and does not stop the rest. */
  runAll(): void
}

export function createCleanupRegistry(): CleanupRegistry {
  let fns: CleanupFn[] = []
  return {
    register(fn) {
      fns.push(fn)
    },
    runAll() {
      // Take the list first so cleanups registered during runAll go to the next batch
      // and each function runs at most once.
      const batch = fns
      fns = []
      for (let i = batch.length - 1; i >= 0; i--) {
        try {
          batch[i]()
        } catch (err) {
          console.error('cleanup failed', err)
        }
      }
    },
  }
}

/** The registry for the currently loaded act. */
export const cleanupRegistry: CleanupRegistry = createCleanupRegistry()

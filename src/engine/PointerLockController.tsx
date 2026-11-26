import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { registerSystem } from './frameDriver'
import { fxStore } from './fx'
import {
  isDebugUrl,
  isPlaying,
  lockRuntime,
  nowMs,
  pauseCollector,
  requestLock,
  setLockTarget,
} from './inputRuntime'
import { shouldHoldLock } from './pointerLock'
import { gameStore } from './store'

/** Runs after every other system but before Input's endFrame (1000). */
export const PAUSE_DECISION_PRIORITY = 999

/**
 * Click-to-lock, lock tracking, and pause triggers. Raw events are noted into a
 * collector and settled once per frame, so Escape plus lock loss pauses once.
 */
export function PointerLockController() {
  const canvas = useThree((s) => s.gl.domElement)

  useEffect(() => {
    const debug = isDebugUrl()
    setLockTarget(() => canvas)

    const onClick = () => {
      const s = gameStore.getState()
      if (!isPlaying() || s.paused || lockRuntime.locked) return
      requestLock()
    }

    const onLockChange = () => {
      lockRuntime.lockChangeAtMs = nowMs()
      gameStore.getState().setPointerLocked(document.pointerLockElement !== null)
      if (document.pointerLockElement) {
        lockRuntime.locked = true
        lockRuntime.wasHeld = true
        lockRuntime.everLocked = true
        pauseCollector.note({ wasHeld: true, debug })
      } else {
        lockRuntime.locked = false
        pauseCollector.note({ lockLost: true, wasHeld: lockRuntime.wasHeld, debug })
        // After a loss the lock is no longer held; a later loss needs a fresh hold.
        lockRuntime.wasHeld = false
      }
    }

    const onLockError = () => {
      // A rejected request leaves the game paused unless debug play is allowed.
      if (!debug) gameStore.getState().setPaused(true)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || e.repeat || !isPlaying()) return
      pauseCollector.note({ escapePressed: true, wasHeld: lockRuntime.wasHeld, debug })
    }

    const onVisibility = () => {
      if (document.hidden) pauseCollector.note({ tabHidden: true, wasHeld: lockRuntime.wasHeld, debug })
    }

    // Menus, system screens and pause need a free cursor: let go of the lock when one shows.
    const releaseIfMenu = () => {
      const s = gameStore.getState()
      if (shouldHoldLock(s.screen, s.paused, fxStore.getState().card !== null, s.choiceOpen) || !document.pointerLockElement) return
      lockRuntime.wasHeld = false // a deliberate release is not a lock loss
      try {
        document.exitPointerLock()
      } catch {
        /* no lock to release */
      }
    }
    releaseIfMenu()
    const unsubscribe = gameStore.subscribe(releaseIfMenu)
    const unsubscribeFx = fxStore.subscribe(releaseIfMenu)

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('pointerlockerror', onLockError)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)

    // One decision per frame. Not pausable, so it also settles while paused.
    const unregister = registerSystem(
      'pause-decision',
      PAUSE_DECISION_PRIORITY,
      () => {
        const s = gameStore.getState()
        const next = pauseCollector.decide(s.paused)
        if (next !== s.paused) s.setPaused(next)
      },
      { pausable: false },
    )

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('pointerlockerror', onLockError)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
      unregister()
      unsubscribe()
      unsubscribeFx()
      setLockTarget(null)
    }
  }, [canvas])

  return null
}

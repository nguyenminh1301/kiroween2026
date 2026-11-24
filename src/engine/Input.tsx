import { useEffect } from 'react'
import { applyKeyDown, applyKeyUp, applyMouseDown, applyMouseUp, clearAllHeld, endFrame } from './input'
import { feedMouseMove, inputState, lockRuntime, resetMouseMovement } from './inputRuntime'
import { registerSystem } from './frameDriver'

/** Last priority, so every other system sees this frame's `pressed` flags first. */
export const INPUT_END_FRAME_PRIORITY = 1000

/** DOM listeners for keys, mouse, blur and visibility. State lives in refs and plain objects. */
export function Input() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => applyKeyDown(inputState, e.code)
    const onKeyUp = (e: KeyboardEvent) => applyKeyUp(inputState, e.code)
    const onMouseMove = (e: MouseEvent) => {
      feedMouseMove(e.movementX, e.movementY)
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) applyMouseDown(inputState, lockRuntime.locked)
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) applyMouseUp(inputState)
    }
    const clearHeld = () => {
      clearAllHeld(inputState)
      resetMouseMovement()
    }
    const onVisibility = () => {
      if (document.hidden) clearHeld()
    }
    const onLockChange = () => {
      // Releasing the lock ends any mouse hold on `use`.
      if (!document.pointerLockElement) applyMouseUp(inputState)
      resetMouseMovement()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', clearHeld)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('pointerlockchange', onLockChange)

    // Not pausable: pressed flags must clear even while paused.
    const unregister = registerSystem(
      'input-end-frame',
      INPUT_END_FRAME_PRIORITY,
      () => endFrame(inputState),
      { pausable: false },
    )

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', clearHeld)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerlockchange', onLockChange)
      unregister()
    }
  }, [])

  return null
}

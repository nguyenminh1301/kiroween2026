import { useThree } from '@react-three/fiber'
import { useEffect, type ReactNode } from 'react'
import { registerSystem } from '../engine/frameDriver'
import { adaptiveScaler, registerAdaptiveScaler } from './adaptiveScaler'
import { dprFor } from './gameView'
import { lookupLevel } from './levelTable'
import { attachRenderer, recordFrame, resetFrameStats } from './renderStats'
import { snapPatch } from './snapPatch'
import { useGameRect, useLevel } from './useGameView'

/** Letterboxed 16:9 container. Children are the R3F Canvas. Provides the dpr. */
export function GameView({ children }: { children: (dpr: number) => ReactNode }) {
  const rect = useGameRect()
  const level = useLevel()
  const picture = 'sharp' as const
  // The view in real pixels picks the start level. A resize or a zoom change comes through the rect or the dpr.
  const viewPx = Math.round(rect.width * (window.devicePixelRatio || 1))
  useEffect(() => adaptiveScaler.configure(picture, viewPx), [picture, viewPx])
  const dpr = dprFor(lookupLevel(level).width, rect)
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
        {children(dpr)}
      </div>
    </div>
  )
}

/**
 * Lives inside the Canvas. Pins the drawing buffer to the internal resolution,
 * feeds the snap patch and starts the scaler and stats systems.
 */
export function RenderRuntime() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    attachRenderer(gl)
    gl.domElement.style.imageRendering = 'pixelated'
    const apply = (level: number) => {
      const { width, height } = lookupLevel(level)
      snapPatch.setResolution(width, height)
      if (gl.domElement.width !== width || gl.domElement.height !== height) {
        gl.setPixelRatio(1)
        gl.setSize(width, height, false)
      }
    }
    apply(adaptiveScaler.getLevel())
    const unsub = adaptiveScaler.subscribe(apply)
    const removeScaler = registerAdaptiveScaler()
    const removeStats = registerSystem('render-stats', 860, (dt) => {
      recordFrame(dt * 1000)
      // Keep the buffer exactly at the internal resolution after any canvas resize.
      const { width, height } = lookupLevel(adaptiveScaler.getLevel())
      if (gl.domElement.width !== width || gl.domElement.height !== height) {
        gl.setPixelRatio(1)
        gl.setSize(width, height, false)
      }
    })
    return () => {
      unsub()
      removeScaler()
      removeStats()
      resetFrameStats()
      attachRenderer(null)
    }
  }, [gl])
  return null
}

import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { useEffect, useRef } from 'react'
import { adaptiveScaler } from './adaptiveScaler'
import { installContextLoss, isContextLost } from './contextLoss'
import { lookupLevel } from './levelTable'
import { PS1Effect } from './PS1Effect'

/**
 * Runs the one PS1 pass on the low-res buffer. The positive useFrame priority
 * takes over rendering from R3F. If the effect cannot be built the scene is
 * drawn plainly.
 */
export function PS1Composer() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const composerRef = useRef<EffectComposer | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })

  useEffect(() => {
    const removeLoss = installContextLoss(gl.domElement)
    gl.info.autoReset = false
    let composer: EffectComposer | null = null
    try {
      composer = new EffectComposer(gl, { multisampling: 0 })
      composer.addPass(new RenderPass(scene, camera))
      composer.addPass(new EffectPass(camera, new PS1Effect()))
    } catch (err) {
      console.error('PS1 effect failed to build, rendering without it', err)
      composer?.dispose()
      composer = null
    }
    composerRef.current = composer
    sizeRef.current = { w: 0, h: 0 }
    return () => {
      removeLoss()
      composer?.dispose()
      composerRef.current = null
      gl.info.autoReset = true
    }
  }, [gl, scene, camera])

  useFrame(() => {
    if (isContextLost()) return
    gl.info.reset()
    const composer = composerRef.current
    if (!composer) {
      gl.render(scene, camera)
      return
    }
    const { width, height } = lookupLevel(adaptiveScaler.getLevel())
    if (sizeRef.current.w !== width || sizeRef.current.h !== height) {
      composer.setSize(width, height, false)
      sizeRef.current = { w: width, h: height }
    }
    composer.render()
  }, 1)

  return null
}

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { PerspectiveCamera } from 'three'
import { eyePosition } from './playerBody'
import { getPlayerBody } from './playerRuntime'
import { registerSystem } from './frameDriver'
import { getActiveTimeline } from './unloadReset'
import { getCameraShaker } from './cameraShake'

/** After the player (100), focus (200) and timeline (500) systems. */
export const CAMERA_PRIORITY = 600

/**
 * Puts the R3F camera on the player's eye (with `fov` when given), or on the active Timeline's Shot, plus
 * shake. Registers one frame system; it never calls useFrame.
 */
export function PlayerCamera({ far, fov: eyeFov }: { far?: number; fov?: number } = {}) {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const restoreFov = cam.fov
    const baseFov = eyeFov ?? cam.fov
    const baseFar = far ?? cam.far
    const restoreFar = cam.far
    if (cam.far !== baseFar) {
      cam.far = baseFar
      cam.updateProjectionMatrix()
    }
    const remove = registerSystem('camera', CAMERA_PRIORITY, () => {
      const body = getPlayerBody()
      if (!body) return
      const timeline = getActiveTimeline()
      const override = timeline && !timeline.finished ? timeline.camera() : null
      const fov = override?.fov ?? baseFov
      const far = override?.far ?? baseFar
      if (cam.fov !== fov || cam.far !== far) {
        cam.fov = fov
        cam.far = far
        cam.updateProjectionMatrix()
      }
      if (override) {
        const { position, lookAt } = override.pose
        cam.position.set(position.x, position.y, position.z)
        cam.lookAt(lookAt.x, lookAt.y, lookAt.z)
      } else {
        const eye = eyePosition(body)
        cam.position.set(eye.x, eye.y, eye.z)
        cam.rotation.set(body.pitch, body.yaw, 0, 'YXZ')
      }
      const shaker = getCameraShaker()
      const sample = shaker ? shaker() : null
      if (sample) {
        cam.position.x += sample.ox
        cam.position.y += sample.oy
        cam.position.z += sample.oz
        cam.rotateX(sample.rx)
        cam.rotateY(sample.ry)
        cam.rotateZ(sample.rz)
      }
      const amp = !shaker && timeline && !timeline.finished ? timeline.shake() : 0
      if (amp > 0) {
        cam.position.x += (Math.random() - 0.5) * 2 * amp
        cam.position.y += (Math.random() - 0.5) * 2 * amp
        cam.position.z += (Math.random() - 0.5) * 2 * amp
      }
    })
    return () => {
      remove()
      cam.fov = restoreFov
      cam.far = restoreFar
      cam.updateProjectionMatrix()
    }
  }, [camera, far, eyeFov])

  return null
}

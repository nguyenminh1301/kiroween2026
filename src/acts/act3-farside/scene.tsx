import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { SpotLight, Object3D } from 'three'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { applyFog, clearFog } from '../../render/fog'
import { viewDirection } from '../../interaction/targeting'
import { Corridor } from './corridor'
import { Creature } from './creature'

const FOG = { color: '#000000', near: 2, far: 13 }
const FLASH_PRIORITY = 650
const AIM = 4

/** The flashlight: one spot light riding on the camera, aimed 4 m ahead. */
function Flashlight() {
  const light = useMemo(() => {
    const l = new SpotLight('#f3e7d3', 14, 14, Math.PI / 7, 0.55, 1.2)
    l.target = new Object3D()
    return l
  }, [])
  useEffect(() => {
    return registerSystem('act3-flashlight', FLASH_PRIORITY, () => {
      const body = getPlayerBody()
      if (!body) return
      const eye = eyePosition(body)
      const d = viewDirection(body.yaw, body.pitch)
      light.position.set(eye.x, eye.y, eye.z)
      light.target.position.set(eye.x + d.x * AIM, eye.y + d.y * AIM, eye.z + d.z * AIM)
      light.target.updateMatrixWorld()
    })
  }, [light])
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  )
}

export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    applyFog(scene, gl, FOG)
    return () => clearFog(scene, gl)
  }, [scene, gl])
  return (
    <>
      <PlayerCamera />
      <ambientLight color="#3a1a14" intensity={0.9} />
      <Flashlight />
      <Corridor />
      <Creature />
    </>
  )
}

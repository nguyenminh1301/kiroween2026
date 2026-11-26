import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AmbientLight, SpotLight, Object3D } from 'three'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { applyFog, clearFog } from '../../render/fog'
import { viewDirection } from '../../interaction/targeting'
import { Corridor } from './corridor'
import { collisionBoxes, CDR_POS, MIKE_POS } from './layout'
import { flashIntensity, rayBoxDistance } from './flashlight'
import { Creature } from './creature'

const FOG = { color: '#000000', near: 4, far: 24 }
const FLASH_PRIORITY = 650
const AIM = 4
const BEAM_MAX = 12
const figureBox = (p: { x: number; y: number; z: number }) => ({
  min: { x: p.x - 0.3, y: p.y, z: p.z - 0.3 },
  max: { x: p.x + 0.3, y: p.y + 1.8, z: p.z + 0.3 },
})

/** The flashlight: one spot light riding on the camera, aimed 4 m ahead. */
function Flashlight() {
  const light = useMemo(() => {
    const l = new SpotLight('#f3e7d3', 14, 16, Math.PI / 6, 0.6, 1.2)
    l.target = new Object3D()
    return l
  }, [])
  const boxes = useMemo(() => [...collisionBoxes(), figureBox(CDR_POS), figureBox(MIKE_POS)], [])
  useEffect(() => {
    return registerSystem('act3-flashlight', FLASH_PRIORITY, () => {
      const body = getPlayerBody()
      if (!body) return
      const eye = eyePosition(body)
      const d = viewDirection(body.yaw, body.pitch)
      // Off inside a locker (it would give you away), softer close to a wall or a suit.
      light.intensity = flashIntensity(body.mode === 'seated', rayBoxDistance(eye, d, boxes, BEAM_MAX))
      light.position.set(eye.x, eye.y, eye.z)
      light.target.position.set(eye.x + d.x * AIM, eye.y + d.y * AIM, eye.z + d.z * AIM)
      light.target.updateMatrixWorld()
    })
  }, [light, boxes])
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  )
}

/** The ambient glow: a little stronger inside a locker so the corridor shows through the slats. */
function Ambient() {
  const light = useMemo(() => new AmbientLight('#4a1c14', 0.9), [])
  useEffect(
    () =>
      registerSystem('act3-ambient', FLASH_PRIORITY + 1, () => {
        const body = getPlayerBody()
        light.intensity = body?.mode === 'seated' ? 2.6 : 0.9
      }),
    [light],
  )
  return <primitive object={light} />
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
      <Ambient />
      <Flashlight />
      <Corridor />
      <Creature />
    </>
  )
}

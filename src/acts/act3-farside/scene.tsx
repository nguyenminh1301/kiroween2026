import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AmbientLight, Color, SpotLight, Object3D } from 'three'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { applyFog, clearFog } from '../../render/fog'
import { viewDirection } from '../../interaction/targeting'
import { Corridor } from './corridor'
import { collisionBoxes, Z_HATCH_END } from './layout'
import { flashIntensity, rayBoxDistance } from './flashlight'
import { Creature } from './creature'
import { Cabin } from './cabin'
import { Cage, CagedCrew, CarriedView } from './cage'
import { act3State } from './state'
import { WindowCrew } from './window'

const FOG = { color: '#000000', near: 4, far: 24 }
/** The real cabin: the same pale haze as act 2. */
const FOG_REAL = { color: '#b8ae98', near: 8, far: 24 }
const FLASH_PRIORITY = 650
const AIM = 4
const BEAM_MAX = 12

/** The flashlight: one spot light riding on the camera, aimed 4 m ahead. */
function Flashlight() {
  const light = useMemo(() => {
    const l = new SpotLight('#f3e7d3', 14, 16, Math.PI / 6, 0.6, 1.2)
    l.target = new Object3D()
    return l
  }, [])
  const boxes = useMemo(() => collisionBoxes(), [])
  useEffect(() => {
    return registerSystem('act3-flashlight', FLASH_PRIORITY, () => {
      const body = getPlayerBody()
      if (!body) return
      const eye = eyePosition(body)
      const d = viewDirection(body.yaw, body.pitch)
      // Off inside a locker (it would give you away), softer close to a wall or a suit.
      light.visible = act3State.world === 'dream'
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

const DREAM_AMBIENT = new Color('#4a1c14')
const CABIN_AMBIENT = new Color('#a89a86')
const REAL_AMBIENT = new Color('#fff0d4')
const LUNGE_AMBIENT = new Color('#f0d8bc')

/** The ambient glow: red in the corridor, a little stronger inside a locker so the corridor shows through the
 *  slats, plain warm in the cabin, and dim warm light after waking. */
function Ambient() {
  const light = useMemo(() => new AmbientLight('#4a1c14', 0.9), [])
  useEffect(
    () =>
      registerSystem('act3-ambient', FLASH_PRIORITY + 1, () => {
        const body = getPlayerBody()
        if (act3State.lunge !== null && act3State.world === 'dream') {
          // The swallow: its face is lit, so the player can read it.
          light.color.copy(LUNGE_AMBIENT)
          light.intensity = 4
        } else if (act3State.world === 'real') {
          // The normal cabin, lights on: bright and warm, like act 2.
          light.color.copy(REAL_AMBIENT)
          light.intensity = 3
        } else if (body && body.pos.z > Z_HATCH_END) {
          light.color.copy(CABIN_AMBIENT)
          light.intensity = 1.1
        } else {
          light.color.copy(DREAM_AMBIENT)
          light.intensity = body?.mode === 'seated' ? 6 : 0.9
        }
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
    let real = false
    const remove = registerSystem('act3-fog', FLASH_PRIORITY + 2, () => {
      const now = act3State.world === 'real'
      if (now === real) return
      real = now
      applyFog(scene, gl, real ? FOG_REAL : FOG)
    })
    return () => {
      remove()
      clearFog(scene, gl)
    }
  }, [scene, gl])
  return (
    <>
      <PlayerCamera />
      <Ambient />
      <Flashlight />
      <Corridor />
      <Cabin />
      <Cage />
      <CagedCrew />
      <WindowCrew />
      <Creature />
      <CarriedView />
    </>
  )
}

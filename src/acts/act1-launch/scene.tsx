import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { Cabin } from '../../procgen/cabin/cabin'
import { Console } from '../../procgen/cabin/console'
import { Outside } from './outside'
import { act1State } from './state'

const CABIN_FOG = { color: '#7a6a4c', near: 6, far: 20 }

export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    applyFog(scene, gl, CABIN_FOG)
    return () => clearFog(scene, gl)
  }, [scene, gl])

  const cabin = useRef<Group>(null)
  useEffect(
    () =>
      registerSystem('act1-cabin-visible', 645, () => {
        if (cabin.current) cabin.current.visible = act1State.view === 'cabin'
      }),
    [],
  )

  return (
    <>
      <PlayerCamera />
      <hemisphereLight args={['#f0dcae', '#6a5c44', 1.7]} />
      <pointLight color="#f0c680" intensity={4.5} distance={10} decay={1.2} position={[0, 2.1, 0.4]} />
      <directionalLight color="#fff2d8" intensity={0.9} position={[-40, 60, 40]} />
      <group ref={cabin}>
        <Cabin />
        <Console />
      </group>
      <Outside />
    </>
  )
}

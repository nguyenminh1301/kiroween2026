import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { Cabin } from './cabin'
import { Console } from './console'

const CABIN_FOG = { color: '#4a4232', near: 5, far: 16 }

export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    applyFog(scene, gl, CABIN_FOG)
    return () => clearFog(scene, gl)
  }, [scene, gl])

  return (
    <>
      <PlayerCamera />
      <hemisphereLight args={['#d8c9a0', '#3a342a', 1.1]} />
      <pointLight color="#e9c27a" intensity={3} distance={9} decay={1.2} position={[0, 2.1, 0.4]} />
      <group visible>
        <Cabin />
        <Console />
      </group>
    </>
  )
}

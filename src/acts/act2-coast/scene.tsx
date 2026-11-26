import { useThree } from '@react-three/fiber'
import { useEffect, useSyncExternalStore } from 'react'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { getCmFar, subscribeCmFar } from './state'
import { Props } from './props'
import { Shell } from './shell'

const FOG = { color: '#b8ae98', near: 8, far: 24 }

export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    applyFog(scene, gl, FOG)
    return () => clearFog(scene, gl)
  }, [scene, gl])
  const cmFar = useSyncExternalStore(subscribeCmFar, getCmFar)

  return (
    <>
      <PlayerCamera />
      <hemisphereLight args={['#fff0d4', '#a39a86', 1.5]} />
      <Shell cmFar={cmFar} />
      <Props cmFar={cmFar} />
    </>
  )
}

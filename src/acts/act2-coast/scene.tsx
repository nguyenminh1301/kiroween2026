import { useThree } from '@react-three/fiber'
import { useEffect, useSyncExternalStore } from 'react'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { getCmFar, subscribeCmFar } from './state'
import { Shell } from './shell'

const FOG = { color: '#a8a496', near: 7, far: 22 }

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
      <hemisphereLight args={['#f1eee4', '#8d887a', 1.15]} />
      <Shell cmFar={cmFar} />
    </>
  )
}

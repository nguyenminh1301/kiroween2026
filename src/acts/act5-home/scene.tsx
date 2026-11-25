import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { Cabin } from '../../procgen/cabin/cabin'
import { Console } from '../../procgen/cabin/console'
import { applyFog, clearFog } from '../../render/fog'
import { EntrySet } from './entry'
import { OceanSet } from './ocean'
import { act5State } from './state'

const CABIN_FOG = { color: '#4a4232', near: 5, far: 16 }
const OCEAN_FOG = { color: '#c6d7e4', near: 900, far: 5200 }

export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const cabin = useRef<Group>(null)

  useEffect(() => {
    let last = ''
    const removeFog = registerSystem('act5-view', 659, () => {
      const v = act5State.view
      if (cabin.current) cabin.current.visible = v === 'cabin'
      if (v === last) return
      last = v
      if (v === 'ocean') applyFog(scene, gl, OCEAN_FOG)
      else if (v === 'cabin') applyFog(scene, gl, CABIN_FOG)
      else clearFog(scene, gl)
    })
    return () => {
      removeFog()
      clearFog(scene, gl)
    }
  }, [scene, gl])

  return (
    <>
      <PlayerCamera />
      <hemisphereLight args={['#d8c9a0', '#3a342a', 1.1]} />
      <pointLight color="#e9c27a" intensity={3} distance={9} decay={1.2} position={[0, 2.1, 0.4]} />
      <directionalLight color="#fff2d8" intensity={0.9} position={[-40, 60, 40]} />
      <group ref={cabin}>
        <Cabin />
        <Console />
      </group>
      <EntrySet />
      <OceanSet />
    </>
  )
}

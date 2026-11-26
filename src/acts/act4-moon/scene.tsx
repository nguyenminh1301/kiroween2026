import { PlayerCamera } from '../../engine/PlayerCamera'
import { Lander } from './lander'
import { Moon } from './moon'
import { NeilView } from './neilView'

/** Hard low sun from one side, almost no fill, black sky, no fog. */
export function Scene() {
  return (
    <>
      <PlayerCamera far={4000} />
      <ambientLight color="#6a6a76" intensity={1.6} />
      <directionalLight color="#fff1dc" intensity={2.3} position={[40, 24, 60]} />
      <Moon />
      <Lander />
      <NeilView />
    </>
  )
}

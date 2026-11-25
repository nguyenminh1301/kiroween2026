import { PlayerCamera } from '../../engine/PlayerCamera'
import { CreatureView } from './creatureView'
import { Lander } from './lander'
import { Moon } from './moon'

/** Hard low sun from one side, almost no fill, black sky, no fog. */
export function Scene() {
  return (
    <>
      <PlayerCamera />
      <ambientLight color="#3c3c46" intensity={1.1} />
      <directionalLight color="#fff1dc" intensity={2.3} position={[40, 24, 60]} />
      <Moon />
      <Lander />
      <CreatureView />
    </>
  )
}

import { useFrame } from '@react-three/fiber'
import { frameDriver } from './frameDriver'

/** The only useFrame caller in the app. Steps the module-level driver; no React state. */
export function FrameDriver() {
  useFrame((_state, delta) => {
    frameDriver.step(delta)
  })
  return null
}

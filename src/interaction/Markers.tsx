import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Mesh } from 'three'
import { registerSystem } from '../engine/frameDriver'
import { gameStore } from '../engine/store'
import { getInteractables, getInteractablesVersion, subscribeInteractables } from './interactables'

const MARKER_PRIORITY = 700

/** World markers for the interactables the objective lists. Visible through walls. */
export function Markers() {
  useSyncExternalStore(subscribeInteractables, getInteractablesVersion)
  const objective = useSyncExternalStore(gameStore.subscribe, () => gameStore.getState().objective)
  const ids = objective?.markers ?? []
  const spots = getInteractables().filter((i) => ids.includes(i.id))
  const refs = useRef<(Mesh | null)[]>([])

  useEffect(() => {
    return registerSystem('markers', MARKER_PRIORITY, (_dt, t) => {
      const s = 1 + 0.25 * Math.sin(t * 5)
      for (const m of refs.current) {
        if (m) {
          m.scale.setScalar(s)
          m.rotation.y = t * 1.5
        }
      }
    })
  }, [])

  return (
    <>
      {spots.map((i, n) => (
        <mesh
          key={i.id}
          ref={(m) => {
            refs.current[n] = m
          }}
          position={[i.position.x, i.position.y + i.radius + 0.12, i.position.z]}
          renderOrder={999}
        >
          <octahedronGeometry args={[0.08, 0]} />
          <meshBasicMaterial color="#e9b740" depthTest={false} depthWrite={false} transparent opacity={0.9} />
        </mesh>
      ))}
    </>
  )
}

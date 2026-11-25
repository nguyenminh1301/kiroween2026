// The act 4 creature view: the shared model, driven by `act4State.creature`.
import { useEffect, useMemo } from 'react'
import { Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { buildCreature, poseCreature } from '../../procgen/creatureModel'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { act4State } from './state'

const CREATURE_PRIORITY = 710

export function CreatureView() {
  const mat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const bones = useMemo(() => {
    const b = buildCreature(mat)
    b.root.visible = false
    return b
  }, [mat])

  useEffect(() => {
    let phase = 0
    return registerSystem('act4-creature', CREATURE_PRIORITY, (dt, t) => {
      const c = act4State.creature
      bones.root.visible = c.visible
      if (!c.visible) return
      phase += dt * (c.anim === 'crawl' ? 7 : c.anim === 'walk' ? 4.2 : 0)
      bones.root.position.set(c.x, c.y, c.z)
      bones.root.rotation.y = c.heading + Math.PI
      poseCreature(bones, c.anim, t, phase)
    })
  }, [bones])

  useEffect(
    () => () => {
      bones.root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
      disposeMaterial(mat)
    },
    [bones, mat],
  )
  return <primitive object={bones.root} />
}

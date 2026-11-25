// The act 3 creature view: the shared model, driven by the monster state.
import { useEffect, useMemo } from 'react'
import { Mesh, PlaneGeometry } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { buildCreature, poseCreature } from '../../procgen/creatureModel'
import { act3State } from './state'

const CREATURE_PRIORITY = 710
/** The dim red glow behind the creature in the reveal, so its shape reads against it. */
const RIM_COLOR = '#7a2a1a'
const RIM_BEHIND = 0.9
const RIM_Y = 1.1

export function Creature() {
  const mat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const bones = useMemo(() => {
    const b = buildCreature(mat)
    b.root.visible = false
    return b
  }, [mat])

  const rimMat = useMemo(() => createMaterial({ kind: 'unlit', color: RIM_COLOR, fog: false }), [])
  const rim = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(2.8, 2.6), rimMat)
    m.visible = false
    return m
  }, [rimMat])

  useEffect(() => {
    let phase = 0
    const remove = registerSystem('act3-creature', CREATURE_PRIORITY, (dt, t) => {
      const m = act3State.monster
      const vis = !!m && act3State.creatureVisible
      bones.root.visible = vis
      // Only the reveal behind Mike is backlit. The flashlight does the rest.
      rim.visible = vis && m.mode === 'scripted'
      if (!m || !vis) return
      if (rim.visible) rim.position.set(m.pos.x, RIM_Y, m.pos.z - RIM_BEHIND)
      const moving = m.anim !== 'freeze'
      phase += dt * (m.anim === 'crawl' ? 7 : m.mode === 'hunt' || m.mode === 'encounter' ? 4.2 : 2.6) * (moving ? 1 : 0)
      bones.root.position.set(m.pos.x, act3State.creatureY, m.pos.z)
      bones.root.rotation.y = m.heading + Math.PI
      poseCreature(bones, m.anim, t, phase)
    })
    return () => {
      remove()
    }
  }, [bones, rim])

  useEffect(
    () => () => {
      rim.geometry.dispose()
      disposeMaterial(rimMat)
    },
    [rim, rimMat],
  )
  useEffect(
    () => () => {
      bones.root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    },
    [bones],
  )
  useEffect(
    () => () => {
      disposeMaterial(mat)
    },
    [mat],
  )
  return (
    <>
      <primitive object={bones.root} />
      <primitive object={rim} />
    </>
  )
}

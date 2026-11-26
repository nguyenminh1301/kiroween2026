// The act 3 creature view: the astronaut model, driven by the monster state and, at the end, the lunge.
import { useEffect, useMemo } from 'react'
import { BackSide, Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { getPlayerBody } from '../../engine/playerRuntime'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { buildAstronaut, poseAstronaut } from '../../procgen/astronaut'
import { lungeFrame } from '../../procgen/lunge'
import { CAGED } from './layout'

const AMBUSH_POS = { x: 0, z: CAGED.cdr.z - 0.5 }
import { act3State } from './state'

const CREATURE_PRIORITY = 710
/** The dim red rim: an inverted hull in unlit dark red. No second dynamic light. */
const RIM_COLOR = '#5a1810'
/** How far toward the camera the root travels in the lunge, as a share of the distance. The lean does the rest. */
const REACH_SHARE = 0.65

export function Creature() {
  const mat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const rimMat = useMemo(() => {
    const m = createMaterial({ kind: 'unlit', color: RIM_COLOR, fog: false, snap: false })
    m.side = BackSide
    return m
  }, [])
  const bones = useMemo(() => {
    const b = buildAstronaut(mat, rimMat)
    b.root.visible = false
    return b
  }, [mat, rimMat])

  useEffect(() => {
    let phase = 0
    return registerSystem('act3-creature', CREATURE_PRIORITY, (dt, t) => {
      const m = act3State.monster
      const lunge = act3State.lunge
      const vis = act3State.world === 'dream' && ((!!m && act3State.creatureVisible && !act3State.silent) || lunge !== null)
      bones.root.visible = vis
      if (!vis) return
      if (lunge !== null) {
        const body = getPlayerBody()
        const f = lungeFrame(lunge)
        const px = body?.pos.x ?? AMBUSH_POS.x
        const pz = body?.pos.z ?? AMBUSH_POS.z + 2
        const k = f.reach * REACH_SHARE
        bones.root.position.set(AMBUSH_POS.x + (px - AMBUSH_POS.x) * k, -f.reach * 0.5, AMBUSH_POS.z + (pz - AMBUSH_POS.z) * k)
        bones.root.rotation.y = Math.atan2(px - AMBUSH_POS.x, pz - AMBUSH_POS.z)
        poseAstronaut(bones, 'freeze', t, 0, { lunge })
        return
      }
      if (!m) return
      const moving = m.anim !== 'freeze'
      phase += dt * (m.anim === 'crawl' ? 7 : m.mode === 'hunt' || m.mode === 'encounter' ? 4.2 : 2.6) * (moving ? 1 : 0)
      bones.root.position.set(m.pos.x, act3State.creatureY, m.pos.z)
      bones.root.rotation.y = m.heading + Math.PI
      poseAstronaut(bones, m.anim, t, phase, { x: m.pos.x, z: m.pos.z, heading: m.heading + Math.PI, sound: act3State.sound })
    })
  }, [bones])

  useEffect(
    () => () => {
      const seen = new Set<unknown>()
      bones.root.traverse((o) => {
        if (o instanceof Mesh && !seen.has(o.geometry)) {
          seen.add(o.geometry)
          o.geometry.dispose()
        }
      })
      disposeMaterial(mat)
      disposeMaterial(rimMat)
    },
    [bones, mat, rimMat],
  )
  return <primitive object={bones.root} />
}

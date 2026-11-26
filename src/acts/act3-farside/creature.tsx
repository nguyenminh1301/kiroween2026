// The act 3 creature view: the astronaut model, driven by the monster state and, at the end, the lunge.
import { useEffect, useMemo } from 'react'
import { BackSide, Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { getPlayerBody } from '../../engine/playerRuntime'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { buildAstronaut, poseAstronaut } from '../../procgen/astronaut'
import { lungeDistance, lungeFrame } from '../../procgen/lunge'
import { CAGED } from './layout'

const AMBUSH_POS = { x: 0, z: CAGED.cdr.z - 0.5 }
import { act3State } from './state'

const CREATURE_PRIORITY = 710
/** The dim red rim: an inverted hull in unlit dark red. No second dynamic light. */
const RIM_COLOR = '#5a1810'

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
        // The swallow: suddenly in front of the camera, the head splits open, then the jaws slam shut.
        const body = getPlayerBody()
        const f = lungeFrame(lunge)
        const ex = body?.pos.x ?? AMBUSH_POS.x
        const ez = body?.pos.z ?? AMBUSH_POS.z + 2
        const yaw = body?.yaw ?? 0
        const d = lungeDistance(f.reach)
        bones.root.position.set(ex - Math.sin(yaw) * d, -0.75, ez - Math.cos(yaw) * d)
        bones.root.rotation.y = Math.atan2(ex - bones.root.position.x, ez - bones.root.position.z)
        poseAstronaut(bones, 'freeze', t, 0, { lunge })
        return
      }
      if (!m) return
      const moving = m.anim !== 'freeze'
      phase += dt * (m.anim === 'crawl' ? 7 : m.mode === 'hunt' ? 4.2 : 2.6) * (moving ? 1 : 0)
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

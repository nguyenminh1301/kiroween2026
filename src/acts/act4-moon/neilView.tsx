// Neil on the Moon: a suited figure posed each frame from the act 4 state, plus the camera on his chest.
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, MeshLambertMaterial, type Group, type Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { buildFigure, type Figure } from '../../procgen/figure'
import type { PoseKind } from '../../procgen/figurePose'
import { act4State } from './state'

const PRIORITY = 655

export function NeilView() {
  const holder = useRef<Group>(null)
  const cam = useRef<Mesh>(null)
  const figure = useMemo<Figure>(() => buildFigure({ helmet: true }), [])
  const camGeo = useMemo(() => new BoxGeometry(0.16, 0.1, 0.1), [])
  const camMat = useMemo(() => new MeshLambertMaterial({ color: '#2a2622' }), [])

  useEffect(() => {
    const g = holder.current
    if (g) g.add(figure.root)
    return registerSystem('act4-neil', PRIORITY, () => {
      const n = act4State.neil
      if (!g) return
      g.visible = n.visible
      if (!n.visible) return
      g.position.set(n.x, n.y, n.z)
      g.rotation.y = n.yaw
      const kind: PoseKind = n.anim === 'standing' ? 'standing' : n.anim
      figure.setPose(kind, n.t, n.amount)
      if (cam.current) {
        // The camera hangs on his chest and rises in his hands while he takes the picture.
        cam.current.visible = n.anim === 'camera' || n.anim === 'standing' || n.anim === 'walk'
        const up = n.anim === 'camera' ? n.amount : 0
        cam.current.position.set(0, 1.28 + up * 0.28, 0.24 + up * 0.08)
      }
    })
  }, [figure])

  useEffect(
    () => () => {
      figure.root.removeFromParent()
      figure.dispose()
      camGeo.dispose()
      camMat.dispose()
    },
    [figure, camGeo, camMat],
  )

  return (
    <group ref={holder} visible={false}>
      <mesh ref={cam} geometry={camGeo} material={camMat} />
    </group>
  )
}

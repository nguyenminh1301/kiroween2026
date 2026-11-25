// The Sea King: a grey hull with a boat-like belly, a five-blade main rotor, a tail rotor and the
// stencil "NAVY" and "66" on both sides. Flies from the carrier to a hover beside the capsule.
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, ConeGeometry, DoubleSide, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, type BufferGeometry, type Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HUD } from '../../content/hud'
import { registerSystem } from '../../engine/frameDriver'
import { heliPos, heliProgress, heliYaw } from './heli'
import { act5State } from './state'
import { stencilTexture } from './textures'

function merge(parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return g
}

export function Helicopter() {
  const root = useRef<Group>(null)
  const rotor = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const geo = useMemo(
    () => ({
      // The fuselage points along +z (nose), with the boat-like belly under it.
      hull: merge([
        new BoxGeometry(2.4, 2.2, 6).translate(0, 0, 0),
        new ConeGeometry(1.25, 2.4, 6).scale(1, 1, 1).rotateX(Math.PI / 2).translate(0, 0.1, 4.1),
        new BoxGeometry(1.6, 0.9, 5.2).translate(0, -1.4, -0.2),
        new BoxGeometry(0.9, 0.5, 4.2).translate(0, -1.95, -0.2),
        new BoxGeometry(0.7, 0.9, 5).translate(0, 0.7, -5.2),
        new BoxGeometry(0.4, 1.8, 1.2).translate(0, 1.4, -7.4),
        new BoxGeometry(1.6, 0.5, 1.8).translate(0, 1.5, -0.5),
      ]),
      blade: new BoxGeometry(0.35, 0.05, 7.4).translate(0, 0, 3.7),
      hub: new BoxGeometry(0.5, 0.5, 0.5),
      tailBlade: new BoxGeometry(0.06, 2.4, 0.2),
      stencil: new PlaneGeometry(3.6, 1.8),
    }),
    [],
  )
  const hullMat = useMemo(() => new MeshLambertMaterial({ color: '#8d9398', emissive: '#40454a' }), [])
  const bladeMat = useMemo(() => new MeshLambertMaterial({ color: '#2a2d30' }), [])
  const stencil = useMemo(() => {
    const map = stencilTexture([HUD.heliMarkings.name, HUD.heliMarkings.number])
    return { map, mat: new MeshBasicMaterial({ map, transparent: true, side: DoubleSide, fog: true }) }
  }, [])
  useEffect(() => {
    return registerSystem('act5-heli', 660, (_dt, time) => {
      const g = root.current
      if (!g) return
      const t = act5State.t
      const p = heliProgress(t)
      g.visible = t >= 46
      const pos = heliPos(t)
      g.position.set(pos.x, pos.y + Math.sin(time * 1.7) * 0.15 * p, pos.z)
      g.rotation.y = heliYaw(t)
      g.rotation.x = (1 - p) * p * 0.5
      if (rotor.current) rotor.current.rotation.y = time * 38
      if (tail.current) tail.current.rotation.x = time * 45
    })
  }, [])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      hullMat.dispose()
      bladeMat.dispose()
      stencil.mat.dispose()
      stencil.map.dispose()
    },
    [geo, hullMat, bladeMat, stencil],
  )
  return (
    <group ref={root} visible={false}>
      <mesh geometry={geo.hull} material={hullMat} />
      <mesh geometry={geo.stencil} material={stencil.mat} position={[1.23, 0.1, 0.4]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={geo.stencil} material={stencil.mat} position={[-1.23, 0.1, 0.4]} rotation={[0, -Math.PI / 2, 0]} />
      <group position={[0, 2.1, 0]}>
        <mesh geometry={geo.hub} material={bladeMat} />
        <group ref={rotor}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} geometry={geo.blade} material={bladeMat} rotation={[0, (i * Math.PI * 2) / 5, 0]} />
          ))}
        </group>
      </group>
      <group ref={tail} position={[0.3, 1.9, -7.4]}>
        {[0, 1].map((i) => (
          <mesh key={i} geometry={geo.tailBlade} material={bladeMat} rotation={[(i * Math.PI) / 2, 0, 0]} />
        ))}
      </group>
    </group>
  )
}

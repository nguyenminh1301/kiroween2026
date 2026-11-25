// USS Hornet and the destroyer, built from boxes. Drawn inside the ocean set.
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, ConeGeometry, CylinderGeometry, MeshLambertMaterial, type BufferGeometry, type Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerSystem } from '../../engine/frameDriver'
import { act5State } from './state'
import { DESTROYER, destroyerZ, HORNET_OFFSET } from './timeline'

function merge(parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return g
}

/** Long grey flat-top with an island on the starboard side, long axis on x. */
export function Hornet() {
  const geo = useMemo(
    () => ({
      hull: merge([
        new BoxGeometry(250, 14, 30).translate(0, 7, 0),
        new BoxGeometry(60, 8, 30).rotateY(0).translate(150, 4, 0),
      ]),
      deck: new BoxGeometry(280, 2, 62).translate(0, 15, -6),
      island: merge([
        new BoxGeometry(34, 18, 9).translate(20, 25, 22),
        new BoxGeometry(6, 14, 6).translate(24, 41, 22),
        new BoxGeometry(14, 3, 3).translate(24, 49, 22),
      ]),
    }),
    [],
  )
  const mat = useMemo(
    () => ({ hull: new MeshLambertMaterial({ color: '#6b7076', emissive: '#34383c' }), deck: new MeshLambertMaterial({ color: '#4d5256' }), island: new MeshLambertMaterial({ color: '#868b90' }) }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat],
  )
  return (
    <group position={[HORNET_OFFSET.x, 0, HORNET_OFFSET.z]}>
      <mesh geometry={geo.hull} material={mat.hull} />
      <mesh geometry={geo.deck} material={mat.deck} />
      <mesh geometry={geo.island} material={mat.island} />
    </group>
  )
}

/** A grey destroyer, bow toward -z, steaming in along x -38. */
export function Destroyer() {
  const root = useRef<Group>(null)
  const geo = useMemo(
    () => ({
      hull: new BoxGeometry(14, 9, 100).translate(0, 4.5, 12),
      bow: new ConeGeometry(7.5, 28, 4).scale(1, 1, 0.62).rotateX(-Math.PI / 2).rotateZ(0).translate(0, 4.5, -52),
      house: merge([
        new BoxGeometry(9, 8, 22).translate(0, 13, 6),
        new BoxGeometry(5, 6, 8).translate(0, 20, 4),
        new CylinderGeometry(1.6, 2.2, 8, 6).translate(0, 22, 20),
        new BoxGeometry(1, 14, 1).translate(0, 30, 4),
        new BoxGeometry(5, 3, 8).translate(0, 11, -22),
      ]),
    }),
    [],
  )
  const hullMat = useMemo(() => new MeshLambertMaterial({ color: '#7a8086', emissive: '#3c4044' }), [])
  const houseMat = useMemo(() => new MeshLambertMaterial({ color: '#9aa0a5', emissive: '#44484c' }), [])
  useEffect(
    () => registerSystem('act5-destroyer', 660, () => {
      const r = root.current
      if (r) r.position.z = destroyerZ(act5State.t)
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      hullMat.dispose()
      houseMat.dispose()
    },
    [geo, hullMat, houseMat],
  )
  return (
    <group ref={root} position={[DESTROYER.x, 0, DESTROYER.z0]}>
      <mesh geometry={geo.hull} material={hullMat} />
      <mesh geometry={geo.bow} material={hullMat} />
      <mesh geometry={geo.house} material={houseMat} />
    </group>
  )
}

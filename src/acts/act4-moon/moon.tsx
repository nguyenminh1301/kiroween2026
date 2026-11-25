// The Moon set: terrain mesh, rocks, stars, the Earth and the orange rings at the task sites.
import { useEffect, useMemo } from 'react'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
  Euler,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../../procgen/rng'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { SITES, groundAt, rocks } from './terrain'
import { buildTerrainGeometry } from './terrainGeo'

const EARTH_POS: [number, number, number] = [-40, 75, -110]

function starGeometry(count: number, radius: number): BufferGeometry {
  const rng = createRng(77)
  const arr: number[] = []
  while (arr.length < count * 3) {
    const y = rng() * 1.05 - 0.05
    const th = rng() * Math.PI * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    arr.push(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(arr, 3))
  return g
}

function ringsGeometry(): BufferGeometry {
  const parts = Object.values(SITES).map((s) => {
    const r = new RingGeometry(0.55, 0.75, 20)
    r.rotateX(-Math.PI / 2)
    r.translate(s.x, groundAt(s.x, s.z) + 0.05, s.z)
    return r
  })
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

export function Moon() {
  const terrain = useMemo(buildTerrainGeometry, [])
  const terrainMat = useMemo(() => createMaterial({ color: '#ffffff', textureName: 'regolith', textureSeed: 9 }), [])
  const rockMat = useMemo(() => createMaterial({ color: '#e6e1d2', textureName: 'regolith', textureSeed: 4 }), [])
  const rockGeo = useMemo(() => new IcosahedronGeometry(1, 0), [])
  const rockList = useMemo(() => rocks(), [])
  const stars = useMemo(() => starGeometry(700, 450), [])
  const starMat = useMemo(() => new PointsMaterial({ color: '#ffffff', size: 1, sizeAttenuation: false, fog: false }), [])
  const earth = useMemo(() => new SphereGeometry(6, 16, 12), [])
  const earthMat = useMemo(() => createMaterial({ kind: 'unlit', textureName: 'earthCloud', textureSeed: 3, fog: false, snap: false }), [])
  const rings = useMemo(ringsGeometry, [])
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: '#E2782F', side: DoubleSide }), [])
  const rockMesh = useMemo(() => {
    const m = new InstancedMesh(rockGeo, rockMat, rockList.length)
    const q = new Quaternion()
    const mat = new Matrix4()
    rockList.forEach((r, i) => {
      q.setFromEuler(new Euler(r.tilt, r.yaw, r.tilt * 0.5))
      mat.compose(
        new Vector3(r.x, groundAt(r.x, r.z) + r.size * 0.15, r.z),
        q,
        new Vector3(r.size, r.size * 0.6, r.size * 1.25),
      )
      m.setMatrixAt(i, mat)
    })
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    return m
  }, [rockGeo, rockMat, rockList])

  useEffect(
    () => () => {
      terrain.dispose()
      rockGeo.dispose()
      stars.dispose()
      earth.dispose()
      rings.dispose()
      starMat.dispose()
      ringMat.dispose()
      rockMesh.dispose()
      disposeMaterial(terrainMat)
      disposeMaterial(rockMat)
      disposeMaterial(earthMat)
    },
    [terrain, rockGeo, stars, earth, rings, starMat, ringMat, rockMesh, terrainMat, rockMat, earthMat],
  )

  return (
    <>
      <mesh geometry={terrain} material={terrainMat} frustumCulled={false} />
      <primitive object={rockMesh} />
      <points geometry={stars} material={starMat} frustumCulled={false} />
      <mesh geometry={earth} material={earthMat} position={EARTH_POS} frustumCulled={false} />
      <mesh geometry={rings} material={ringMat} />
    </>
  )
}

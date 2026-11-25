// The entry set at x = -5000: the Earth below, stars, the capsule nose back, its plasma bubble and trail.
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createRng } from '../../procgen/rng'
import { buildSkyDome } from '../../procgen/skyDome'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { act5State } from './state'
import { ENTRY_X } from './timeline'
import { ribbedPanelTexture } from './textures'

const PRIORITY = 660
const PUFFS = 28
export const TILT = 0.9

function stars(count: number, radius: number, seed: number): BufferGeometry {
  const rng = createRng(seed)
  const arr: number[] = []
  while (arr.length < count * 3) {
    const y = rng() * 2 - 1
    const th = rng() * Math.PI * 2
    const r = Math.sqrt(1 - y * y)
    arr.push(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(arr, 3))
  return g
}

/** The command module: a cone of ribbed silver panels over a brown heat shield, pointing up along +y. */
export function Capsule() {
  const geo = useMemo(
    () => ({
      cone: new CylinderGeometry(0.45, 1.95, 3.2, 12, 1),
      nose: new CylinderGeometry(0.3, 0.42, 0.45, 8, 1).translate(0, 1.8, 0),
      shield: new SphereGeometry(4.6, 12, 4, 0, Math.PI * 2, 0, 0.43).rotateX(Math.PI).translate(0, 2.58, 0),
    }),
    [],
  )
  const mat = useMemo(() => {
    const map = ribbedPanelTexture()
    map.repeat.set(2, 1)
    return {
      panel: new MeshLambertMaterial({ map, color: '#ffffff', emissive: '#4a4842' }),
      shield: new MeshLambertMaterial({ color: '#6a4426', emissive: '#3a2412' }),
      nose: new MeshLambertMaterial({ color: '#8a877d' }),
      map,
    }
  }, [])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      mat.map.dispose()
      mat.panel.dispose()
      mat.shield.dispose()
      mat.nose.dispose()
    },
    [geo, mat],
  )
  return (
    <>
      <mesh geometry={geo.cone} material={mat.panel} />
      <mesh geometry={geo.nose} material={mat.nose} />
      <mesh geometry={geo.shield} material={mat.shield} />
    </>
  )
}

export function EntrySet() {
  const root = useRef<Group>(null)
  const capsule = useRef<Group>(null)
  const plasma = useRef<Mesh>(null)
  const core = useRef<Mesh>(null)
  const trail = useRef<InstancedMesh>(null)
  const sky = useMemo(() => buildSkyDome({ top: '#04081c', horizon: '#0d2048', bottom: '#060e26' }, 6000), [])
  const earthGeo = useMemo(() => {
    const g = new SphereGeometry(320, 24, 16)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2)
    return g
  }, [])
  const limbGeo = useMemo(() => new SphereGeometry(334, 24, 16), [])
  const starGeo = useMemo(() => stars(450, 5500, 11), [])
  const bowl = useMemo(() => new SphereGeometry(1, 14, 10), [])
  const puff = useMemo(() => new IcosahedronGeometry(1, 0), [])
  const earthMat = useMemo(() => createMaterial({ kind: 'unlit', textureName: 'earthCloud', textureSeed: 3, fog: false, snap: false }), [])
  const limbMat = useMemo(() => new MeshBasicMaterial({ color: '#4f9bff', side: BackSide, fog: false }), [])
  const plasmaMat = useMemo(
    () => new MeshBasicMaterial({ color: '#ff7fa8', transparent: true, opacity: 0.55, depthWrite: false, fog: false }),
    [],
  )
  const coreMat = useMemo(
    () => new MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, fog: false }),
    [],
  )
  const puffMat = useMemo(() => new MeshBasicMaterial({ color: '#e8884a', transparent: true, opacity: 0.55, depthWrite: false, fog: false }), [])
  const seeds = useMemo(() => {
    const rng = createRng(21)
    return Array.from({ length: PUFFS }, () => [rng(), rng(), rng()] as const)
  }, [])

  useEffect(() => {
    const pink = new Color('#ff7fa8')
    const orange = new Color('#ff8a3a')
    const mx = new Matrix4()
    const q = new Quaternion()
    const p = new Vector3()
    const s = new Vector3()
    return registerSystem('act5-entry', PRIORITY, (_dt, time) => {
      const on = act5State.view === 'entry'
      if (root.current) root.current.visible = on
      if (!on) return
      const h = act5State.heat
      const cap = capsule.current
      if (cap) {
        cap.rotation.z = TILT + Math.sin(time * 1.3) * 0.03
        cap.rotation.x = Math.sin(time * 0.9) * 0.04
      }
      const flick = 1 + Math.sin(time * 23) * 0.05 + Math.sin(time * 37) * 0.04
      if (plasma.current) {
        plasma.current.visible = h > 0.02
        plasma.current.scale.set(2.9 * h * flick, 2.2 * h * flick, 2.9 * h * flick)
        plasmaMat.color.copy(pink).lerp(orange, h)
      }
      if (core.current) {
        core.current.visible = h > 0.02
        core.current.scale.set(2.3 * h * flick, 1.1 * h * flick, 2.3 * h * flick)
      }
      const m = trail.current
      if (m) {
        for (let i = 0; i < PUFFS; i++) {
          const a = i / PUFFS
          const [r1, r2, r3] = seeds[i]
          const drift = (time * 0.5 + r1) % 1
          const sz = h * (0.35 + a * 1.3) * (0.8 + r2 * 0.5) * (1 - 0.2 * drift)
          p.set((r1 - 0.5) * (1 + a * 4), 2.6 + a * 16 + drift * 2, (r3 - 0.5) * (1 + a * 3))
          s.setScalar(sz)
          mx.compose(p, q, s)
          m.setMatrixAt(i, mx)
        }
        m.instanceMatrix.needsUpdate = true
      }
    })
  }, [plasmaMat, seeds])

  useEffect(
    () => () => {
      sky.dispose()
      ;[earthGeo, limbGeo, starGeo, bowl, puff].forEach((g) => g.dispose())
      disposeMaterial(earthMat)
      ;[limbMat, plasmaMat, coreMat, puffMat].forEach((m) => m.dispose())
    },
    [sky, earthGeo, limbGeo, starGeo, bowl, puff, earthMat, limbMat, plasmaMat, coreMat, puffMat],
  )

  return (
    <group ref={root} position={[ENTRY_X, 0, 0]} visible={false}>
      <primitive object={sky.mesh} />
      <points geometry={starGeo} frustumCulled={false}>
        <pointsMaterial color="#ffffff" size={1} sizeAttenuation={false} fog={false} />
      </points>
      <group position={[60, -330, -90]}>
        <mesh geometry={earthGeo} material={earthMat} />
        <mesh geometry={limbGeo} material={limbMat} />
      </group>
      <group ref={capsule} rotation={[0, 0, TILT]}>
        <Capsule />
        <mesh ref={plasma} geometry={bowl} material={plasmaMat} position={[0, -2.2, 0]} visible={false} />
        <mesh ref={core} geometry={bowl} material={coreMat} position={[0, -1.9, 0]} visible={false} />
        <instancedMesh ref={trail} args={[puff, puffMat, PUFFS]} frustumCulled={false} />
      </group>
    </group>
  )
}

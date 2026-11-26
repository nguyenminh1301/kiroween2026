// The ocean set at x = 5000: sea, sky, the capsule under its chutes, splash, foam ring and collar.
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  RingGeometry,
  TorusGeometry,
  Vector3,
  type Group,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerSystem } from '../../engine/frameDriver'
import { createRng } from '../../procgen/rng'
import { buildSkyDome } from '../../procgen/skyDome'
import { Capsule } from './entry'
import { Chutes } from './chutesView'
import { openingJerk, swing } from './chutes'
import { Helicopter } from './helicopter'
import { Escorts, Hornet, Raft } from './ships'
import { act5State } from './state'
import { capsuleY, CLOUD_Y, collarProgress, OCEAN_X, skyBlend, SPLASH_AT, splashProgress } from './timeline'
import { waveY } from './waves'

const PRIORITY = 660
const RINGS = 38
const SEGS = 48

/** Polar grid of vertices, dense near the capsule and stretching to the horizon. */
function buildSea(): BufferGeometry {
  const g = new BufferGeometry()
  const n = RINGS * SEGS
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3))
  g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3), 3))
  const idx: number[] = []
  for (let r = 0; r < RINGS - 1; r++)
    for (let s = 0; s < SEGS; s++) {
      const a = r * SEGS + s
      const b = r * SEGS + ((s + 1) % SEGS)
      const c = (r + 1) * SEGS + s
      const d = (r + 1) * SEGS + ((s + 1) % SEGS)
      idx.push(a, c, b, b, c, d)
    }
  g.setIndex(idx)
  return g
}
const ringRadius = (r: number): number => (r === 0 ? 0 : 3 * 1.22 ** (r - 1))

function updateSea(g: BufferGeometry, t: number, deep: Color, light: Color, tmp: Color): void {
  const pos = g.attributes.position
  const col = g.attributes.color
  for (let r = 0; r < RINGS; r++) {
    const rad = ringRadius(r)
    for (let s = 0; s < SEGS; s++) {
      const th = (s / SEGS) * Math.PI * 2
      const x = Math.cos(th) * rad
      const z = Math.sin(th) * rad
      const y = waveY(x, z, t)
      const i = r * SEGS + s
      pos.setXYZ(i, x, y, z)
      tmp.copy(deep).lerp(light, Math.min(1, Math.max(0, 0.5 + y * 0.9)))
      col.setXYZ(i, tmp.r, tmp.g, tmp.b)
    }
  }
  pos.needsUpdate = true
  col.needsUpdate = true
}

const CLOUDS = 90

/** A cloud layer: flat puffs spread in a ring around the capsule's fall line, all at one height. */
function cloudMatrices(): Matrix4[] {
  const rng = createRng(57)
  const q = new Quaternion()
  return Array.from({ length: CLOUDS }, () => {
    const a = rng() * Math.PI * 2
    const d = 40 + Math.sqrt(rng()) * 2600
    const w = 60 + rng() * 150
    return new Matrix4().compose(new Vector3(Math.cos(a) * d, CLOUD_Y + (rng() - 0.5) * 30, Math.sin(a) * d), q, new Vector3(w, 9 + rng() * 9, w * (0.5 + rng() * 0.6)))
  })
}

export function OceanSet() {
  const root = useRef<Group>(null)
  const capsule = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const collar = useRef<Mesh>(null)
  const spray = useRef<InstancedMesh>(null)
  const glints = useRef<InstancedMesh>(null)
  const clouds = useRef<InstancedMesh>(null)

  const sky = useMemo(() => buildSkyDome({ top: '#9fc0de', horizon: '#dbe7ee', bottom: '#a9c4d8' }, 5500), [])
  const sea = useMemo(buildSea, [])
  const seaMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, fog: true, side: DoubleSide }), [])
  const cloudMat = useMemo(() => new MeshBasicMaterial({ color: '#f2f5f8', fog: false }), [])
  const geo = useMemo(
    () => ({
      // A broken ring: twelve arcs with gaps between them.
      ring: mergeGeometries(
        Array.from({ length: 12 }, (_, i) => {
          const len = (Math.PI * 2) / 12
          const gap = i % 3 === 0 ? 0.55 : 0.2
          return new RingGeometry(1.8 + (i % 2) * 0.25, 2.4 + (i % 2) * 0.3, 2, 1, i * len, len * (1 - gap)).rotateX(-Math.PI / 2)
        }),
        false,
      ),
      collar: new TorusGeometry(2.2, 0.35, 6, 14).rotateX(Math.PI / 2),
      spray: new IcosahedronGeometry(1, 0),
      glint: new CircleGeometry(1, 4).rotateX(-Math.PI / 2),
      cloud: new IcosahedronGeometry(1, 1),
    }),
    [],
  )
  const foamMat = useMemo(() => new MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.9, depthWrite: false, side: DoubleSide }), [])
  const collarMat = useMemo(() => new MeshLambertMaterial({ color: '#e8631a' }), [])
  const glintMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', fog: true }), [])
  const sprayMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff' }), [])
  const seeds = useMemo(() => {
    const rng = createRng(31)
    return Array.from({ length: 40 }, () => [rng(), rng(), rng()] as const)
  }, [])

  useEffect(() => {
    const deep = new Color('#1d5a8c')
    const light = new Color('#4a8fc0')
    const tmp = new Color()
    const mx = new Matrix4()
    const q = new Quaternion()
    const p = new Vector3()
    const s = new Vector3()
    const skyDeep = new Color('#2a46a8')
    const skyMat = sky.mesh.material as MeshBasicMaterial
    const cm = clouds.current
    if (cm) cloudMatrices().forEach((m, i) => cm.setMatrixAt(i, m))
    if (cm) cm.instanceMatrix.needsUpdate = true
    let seaT = -1
    return registerSystem('act5-ocean', PRIORITY, (_dt, time) => {
      const on = act5State.view === 'ocean'
      if (root.current) root.current.visible = on
      if (!on) return
      const t = act5State.t
      // After the blackout the air is deep blue at height and lightens as the capsule comes down. No stars.
      skyMat.color.copy(skyDeep).lerp(tmp.set('#ffffff'), skyBlend(t))
      if (cm) cm.visible = t >= 19.5
      if (Math.abs(time - seaT) > 0.05) {
        seaT = time
        updateSea(sea, time, deep, light, tmp)
      }
      const sp = splashProgress(t)
      const wave = waveY(0, 0, time)
      const cap = capsule.current
      if (cap) {
        cap.position.y = capsuleY(t, wave) + (t < SPLASH_AT ? openingJerk(t) : 0)
        // Under the canopies the capsule swings a little; afloat it rocks as before.
        cap.rotation.z = t < SPLASH_AT ? swing(t) : Math.sin(time * 0.7) * 0.05
        cap.rotation.x = t < SPLASH_AT ? Math.cos(time * 0.8) * 0.04 : 0
      }
      if (ring.current) {
        ring.current.visible = sp > 0
        ring.current.position.y = wave + 0.15
        // A few metres wide, widening a little and fading out.
        const k = 1 + Math.min(1, sp * 2) * 0.9
        ring.current.scale.set(k, 1, k)
        ring.current.rotation.y = sp * 0.5
        foamMat.opacity = Math.max(0, 0.9 - sp * 0.9)
      }
      if (collar.current) {
        const c = collarProgress(t)
        collar.current.visible = c > 0
        collar.current.position.y = wave + 0.7
        collar.current.scale.setScalar(Math.max(0.01, c))
      }
      const sm = spray.current
      if (sm) {
        const u = (t - SPLASH_AT) / 2.6
        for (let i = 0; i < 40; i++) {
          const [r1, r2, r3] = seeds[i]
          if (u <= 0 || u >= 1) {
            s.set(0, 0, 0)
          } else {
            const a = r1 * Math.PI * 2
            const out = (1.5 + r2 * 3.5) * (0.4 + u)
            const hgt = 7 * r3 * Math.sin(Math.PI * u) + 0.2
            p.set(Math.cos(a) * out, hgt, Math.sin(a) * out)
            s.setScalar((0.5 + r2 * 0.6) * (1 - u * 0.5))
          }
          mx.compose(p, q, s)
          sm.setMatrixAt(i, mx)
        }
        sm.instanceMatrix.needsUpdate = true
      }
      const gl = glints.current
      if (gl) {
        for (let i = 0; i < 40; i++) {
          const [r1, r2, r3] = seeds[i]
          const x = -120 + r1 * 240
          const z = -160 + r2 * 200
          const on2 = Math.sin(time * (2 + r3 * 3) + r1 * 20) > 0.2 ? 1 : 0
          p.set(x, waveY(x, z, time) + 0.08, z)
          s.setScalar(on2 * (0.5 + r3 * 0.8))
          mx.compose(p, q, s)
          gl.setMatrixAt(i, mx)
        }
        gl.instanceMatrix.needsUpdate = true
      }
    })
  }, [sea, seeds, foamMat, sky])

  useEffect(
    () => () => {
      sky.dispose()
      sea.dispose()
      Object.values(geo).forEach((g) => g.dispose())
      ;[seaMat, cloudMat, foamMat, collarMat, glintMat, sprayMat].forEach((m) => m.dispose())
    },
    [sky, sea, geo, seaMat, cloudMat, foamMat, collarMat, glintMat, sprayMat],
  )

  return (
    <group ref={root} position={[OCEAN_X, 0, 0]} visible={false}>
      <primitive object={sky.mesh} />
      <mesh geometry={sea} material={seaMat} frustumCulled={false} />
      <instancedMesh ref={clouds} args={[geo.cloud, cloudMat, CLOUDS]} frustumCulled={false} visible={false} />
      <instancedMesh ref={glints} args={[geo.glint, glintMat, 40]} frustumCulled={false} />
      <group ref={capsule} position={[0, 900, 0]}>
        <Capsule />
      </group>
      <Chutes />
      <mesh ref={ring} geometry={geo.ring} material={foamMat} visible={false} />
      <mesh ref={collar} geometry={geo.collar} material={collarMat} visible={false} />
      <instancedMesh ref={spray} args={[geo.spray, sprayMat, 40]} frustumCulled={false} />
      <Raft />
      <Hornet />
      <Escorts />
      <Helicopter />
    </group>
  )
}

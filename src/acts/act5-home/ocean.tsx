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
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Group,
} from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createRng } from '../../procgen/rng'
import { buildSkyDome } from '../../procgen/skyDome'
import { Capsule } from './entry'
import { Helicopter } from './helicopter'
import { Destroyer, Hornet } from './ships'
import { act5State } from './state'
import { canopyTexture } from './textures'
import { capsuleY, collarProgress, drogueOn, mainsOpen, OCEAN_X, SPLASH_AT, splashProgress } from './timeline'
import { waveY } from './waves'

const PRIORITY = 660
const RINGS = 38
const SEGS = 48
const CANOPY_PHI = 1.25

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

/** Lines from the rim of each canopy down to the capsule's top. */
function chuteLines(centers: Vector3[], radius: number, rimY: number, lines: number): BufferGeometry {
  const arr: number[] = []
  const rimR = radius * Math.sin(CANOPY_PHI)
  for (const c of centers)
    for (let k = 0; k < lines; k++) {
      const a = (k / lines) * Math.PI * 2
      arr.push(c.x + Math.cos(a) * rimR, c.y + rimY, c.z + Math.sin(a) * rimR, 0, 1.9, 0)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(arr, 3))
  return g
}

function canopyGeo(radius: number): BufferGeometry {
  return new SphereGeometry(radius, 12, 5, 0, Math.PI * 2, 0, CANOPY_PHI).scale(1, 0.75, 1)
}

const MAIN_R = 11
const DROGUE_R = 2.6
const rimYOf = (r: number): number => r * Math.cos(CANOPY_PHI) * 0.75

export function OceanSet() {
  const root = useRef<Group>(null)
  const capsule = useRef<Group>(null)
  const chutes = useRef<Group>(null)
  const drogues = useRef<Group>(null)
  const mains = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const collar = useRef<Mesh>(null)
  const spray = useRef<InstancedMesh>(null)
  const glints = useRef<InstancedMesh>(null)

  const sky = useMemo(() => buildSkyDome({ top: '#9fc0de', horizon: '#dbe7ee', bottom: '#a9c4d8' }, 5500), [])
  const sea = useMemo(buildSea, [])
  const seaMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, fog: true, side: DoubleSide }), [])
  const canopyMat = useMemo(() => new MeshBasicMaterial({ map: canopyTexture(), side: DoubleSide, color: '#f2eee6' }), [])
  const lineMat = useMemo(() => new LineBasicMaterial({ color: '#d8d4c8' }), [])
  const geo = useMemo(() => {
    const mainC = [0, 1, 2].map((i) => {
      const a = Math.PI / 2 + (i * Math.PI * 2) / 3
      return new Vector3(Math.cos(a) * 9, 30 - rimYOf(MAIN_R), Math.sin(a) * 9)
    })
    const drogueC = [-3.2, 3.2].map((x) => new Vector3(x, 17 - rimYOf(DROGUE_R), 0))
    return {
      mainC,
      drogueC,
      main: canopyGeo(MAIN_R),
      drogue: canopyGeo(DROGUE_R),
      mainLines: chuteLines(mainC, MAIN_R, rimYOf(MAIN_R), 24),
      drogueLines: chuteLines(drogueC, DROGUE_R, rimYOf(DROGUE_R), 12),
      ring: new RingGeometry(1.7, 2.6, 24).rotateX(-Math.PI / 2),
      collar: new TorusGeometry(2.2, 0.35, 6, 14).rotateX(Math.PI / 2),
      spray: new IcosahedronGeometry(1, 0),
      glint: new CircleGeometry(1, 4).rotateX(-Math.PI / 2),
    }
  }, [])
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
    let seaT = -1
    return registerSystem('act5-ocean', PRIORITY, (_dt, time) => {
      const on = act5State.view === 'ocean'
      if (root.current) root.current.visible = on
      if (!on) return
      const t = act5State.t
      if (Math.abs(time - seaT) > 0.05) {
        seaT = time
        updateSea(sea, time, deep, light, tmp)
      }
      const sp = splashProgress(t)
      const wave = waveY(0, 0, time)
      const cap = capsule.current
      if (cap) {
        cap.position.y = capsuleY(t, wave)
        cap.rotation.z = t < SPLASH_AT ? Math.sin(time * 0.9) * 0.12 : Math.sin(time * 0.7) * 0.05
        cap.rotation.x = t < SPLASH_AT ? Math.cos(time * 0.8) * 0.06 : 0
      }
      const ch = chutes.current
      if (ch) {
        ch.position.y = cap ? cap.position.y : 0
        ch.visible = t >= 21 && sp < 0.45
        const open = mainsOpen(t)
        if (drogues.current) drogues.current.visible = drogueOn(t) || (t >= 28 && t < 29)
        if (mains.current) {
          mains.current.visible = open > 0
          const k = (0.1 + 0.9 * open) * (1 - sp / 0.45)
          mains.current.scale.set(k, k * (0.4 + 0.6 * open), k)
        }
      }
      if (ring.current) {
        ring.current.visible = sp > 0
        ring.current.position.y = wave + 0.15
        const k = 1 + sp * 4.5
        ring.current.scale.set(k, 1, k)
        foamMat.opacity = 0.95 - sp * 0.35
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
  }, [sea, seeds, foamMat])

  useEffect(
    () => () => {
      sky.dispose()
      sea.dispose()
      ;[geo.main, geo.drogue, geo.mainLines, geo.drogueLines, geo.ring, geo.collar, geo.spray, geo.glint].forEach((g) => g.dispose())
      canopyMat.map?.dispose()
      ;[seaMat, canopyMat, lineMat, foamMat, collarMat, glintMat, sprayMat].forEach((m) => m.dispose())
    },
    [sky, sea, geo, seaMat, canopyMat, lineMat, foamMat, collarMat, glintMat, sprayMat],
  )

  const lines = useMemo(
    () => ({ drogue: new LineSegments(geo.drogueLines, lineMat), main: new LineSegments(geo.mainLines, lineMat) }),
    [geo, lineMat],
  )

  return (
    <group ref={root} position={[OCEAN_X, 0, 0]} visible={false}>
      <primitive object={sky.mesh} />
      <mesh geometry={sea} material={seaMat} frustumCulled={false} />
      <instancedMesh ref={glints} args={[geo.glint, glintMat, 40]} frustumCulled={false} />
      <group ref={capsule} position={[0, 900, 0]}>
        <Capsule />
      </group>
      <group ref={chutes} position={[0, 900, 0]} visible={false}>
        <group ref={drogues}>
          {geo.drogueC.map((c, i) => (
            <mesh key={i} geometry={geo.drogue} material={canopyMat} position={c} />
          ))}
          <primitive object={lines.drogue} />
        </group>
        <group ref={mains} visible={false}>
          {geo.mainC.map((c, i) => (
            <mesh key={i} geometry={geo.main} material={canopyMat} position={c} />
          ))}
          <primitive object={lines.main} />
        </group>
      </group>
      <mesh ref={ring} geometry={geo.ring} material={foamMat} visible={false} />
      <mesh ref={collar} geometry={geo.collar} material={collarMat} visible={false} />
      <instancedMesh ref={spray} args={[geo.spray, sprayMat, 40]} frustumCulled={false} />
      <Hornet />
      <Destroyer />
      <Helicopter />
    </group>
  )
}

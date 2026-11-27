// The parachutes: the cover, two cone drogues, three pilot chutes, three mains, and the mains after release.
// One frame system reads the timeline time and poses everything; nothing here goes through React state.
import { useEffect, useMemo, useRef } from 'react'
import {
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerSystem } from '../../engine/frameDriver'
import {
  DROGUE_DIAMETER,
  DROGUE_LINE_WIDTH,
  MAIN_COUNT,
  MAIN_DIAMETER,
  MAIN_LINE_WIDTH,
  RELEASE_AT,
  RISER_BASE_RADIUS,
  RISER_WIDTH,
  breathe,
  canopyShape,
  coverAt,
  drogueFill,
  droguePos,
  drogueState,
  mainPose,
  mainsOpen,
  openingJerk,
  pilotRun,
  releasedAt,
  riserBase,
  rimPoint,
  sway,
} from './chutes'
import { act5State } from './state'
import { canopyTexture } from './textures'
import { capsuleY, SPLASH_AT } from './timeline'
import { waveY } from './waves'

const PRIORITY = 662
const PHI = 1.25
const MAIN_R = MAIN_DIAMETER / 2 / Math.sin(PHI)
const DROGUE_R = DROGUE_DIAMETER / 2
const DROGUE_H = 6
const LINES_MAIN = 24
const LINES_DROGUE = 8
const RIM_Y = 0.236
/** Instances for every line and riser: 3 mains, 2 drogues, 3 pilot lines and the risers. */
const SEGMENTS = MAIN_COUNT * (LINES_MAIN + 1) + 2 * (LINES_DROGUE + 1) + 3 + 8

const dome = (r: number): BufferGeometry => new SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, PHI).scale(1, 0.75, 1)

/** A round ribbon parachute: a cone built from stacked bands with gaps between them. Mouth at -H/2, apex at +H/2. */
function ribbonCone(radius: number, height: number, bands: number): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (let k = 0; k < bands; k++) {
    const u0 = k / bands + (k === 0 ? 0 : 0.025)
    const u1 = (k + 1) / bands - (k === bands - 1 ? 0 : 0.025)
    const pts: Vector2[] = []
    for (let j = 0; j <= 3; j++) {
      const u = u0 + ((u1 - u0) * j) / 3
      pts.push(new Vector2(Math.max(0.02, radius * Math.cos(u * Math.PI * 0.5) ** 0.85), -height / 2 + u * height))
    }
    parts.push(new LatheGeometry(pts, 14))
  }
  const g = mergeGeometries(parts) as BufferGeometry
  parts.forEach((x) => x.dispose())
  return g
}

const UP = new Vector3(0, 1, 0)
const tmpA = new Vector3()
const tmpB = new Vector3()
const tmpQ = new Quaternion()
const tmpM = new Matrix4()
const tmpS = new Vector3()

type P = { x: number; y: number; z: number }

export function Chutes() {
  const group = useRef<Group>(null)
  const cover = useRef<Mesh>(null)
  const drogues = useRef<Array<Mesh | null>>([])
  const pilots = useRef<Array<Mesh | null>>([])
  const mains = useRef<Array<Mesh | null>>([])
  const freed = useRef<Array<Mesh | null>>([])

  const geo = useMemo(
    () => ({
      main: dome(MAIN_R),
      drogue: ribbonCone(DROGUE_R, DROGUE_H, 5),
      pilot: new ConeGeometry(0.7, 1.6, 8, 1, true),
      cover: new ConeGeometry(0.55, 0.6, 8),
      /** Unit-length bar along y with a 1 m wide square section, scaled per segment. */
      bar: new CylinderGeometry(0.5, 0.5, 1, 4, 1),
    }),
    [],
  )
  const mat = useMemo(
    () => ({
      canopy: new MeshBasicMaterial({ map: canopyTexture(), side: DoubleSide, color: '#f2eee6' }),
      cover: new MeshBasicMaterial({ color: '#8a877d' }),
      line: new MeshBasicMaterial({ color: '#e6e0cf' }),
    }),
    [],
  )
  const bars = useMemo(() => {
    const m = new InstancedMesh(geo.bar, mat.line, SEGMENTS)
    m.frustumCulled = false
    return m
  }, [geo, mat])

  useEffect(() => {
    let startPos: Array<{ x: number; y: number; z: number }> | null = null
    return registerSystem('act5-chutes', PRIORITY, (_dt, time) => {
      const g = group.current
      if (!g) return
      const t = act5State.t
      const on = act5State.view === 'ocean'
      const aloft = on && t >= 20.5 && t < RELEASE_AT
      g.visible = aloft
      const wave = waveY(0, 0, time)
      const capY = capsuleY(t, wave) + (t < SPLASH_AT ? openingJerk(t) : 0)
      g.position.y = capY + 1.9
      g.rotation.z = t < SPLASH_AT ? sway(t) : 0
      let n = 0
      /** One line or riser: a thin bar from a to b, `w` metres wide. */
      const seg = (a: P, b: P, w: number): void => {
        tmpA.set(a.x, a.y, a.z)
        tmpB.set(b.x, b.y, b.z).sub(tmpA)
        const len = tmpB.length()
        if (len < 1e-6 || n >= SEGMENTS) return
        tmpQ.setFromUnitVectors(UP, tmpB.divideScalar(len))
        tmpA.addScaledVector(tmpB, len / 2)
        tmpM.compose(tmpA, tmpQ, tmpS.set(w, len, w))
        bars.setMatrixAt(n++, tmpM)
      }
      const open = mainsOpen(t)
      const shape = canopyShape(open)
      const apexes: P[] = []
      if (aloft) {
        const c = coverAt(t)
        if (cover.current) {
          cover.current.visible = c !== null
          if (c) {
            cover.current.position.set(c.pos.x, c.pos.y, c.pos.z)
            cover.current.rotation.set(c.spin, 0, c.spin * 0.7)
          }
        }
        // Drogues: each on its own riser to the capsule top. The lines gather a little below the mouth.
        const ds = drogueState(t)
        const fill = drogueFill(t)
        for (let s = 0; s < 2; s++) {
          const m = drogues.current[s]
          if (!m) continue
          m.visible = ds !== 'hidden'
          if (ds === 'hidden') continue
          const side = s === 0 ? -1 : 1
          const p = droguePos(t, side)
          m.position.set(p.x, p.y, p.z)
          m.scale.set(fill, 1.5 - 0.5 * Math.min(1, fill), fill)
          m.rotation.z = ds === 'falling' ? side * 0.6 : 0
          const mouth = { x: p.x, y: p.y - (DROGUE_H / 2) * m.scale.y, z: p.z }
          const base = { x: side * RISER_BASE_RADIUS, y: 0, z: 0 }
          const gather =
            ds === 'out'
              ? { x: mouth.x + (base.x - mouth.x) * 0.2, y: mouth.y + (base.y - mouth.y) * 0.2, z: mouth.z }
              : { x: mouth.x, y: mouth.y - 3, z: mouth.z }
          const rr = DROGUE_R * fill
          for (let k = 0; k < LINES_DROGUE; k++) {
            const a = (k / LINES_DROGUE) * Math.PI * 2
            seg({ x: mouth.x + Math.cos(a) * rr, y: mouth.y, z: mouth.z + Math.sin(a) * rr }, gather, DROGUE_LINE_WIDTH)
          }
          // Cut at 28.2 s: the riser lets go of the capsule and trails above the falling drogue.
          seg(gather, ds === 'out' ? base : { x: gather.x - side * 1.5, y: gather.y + 6, z: gather.z }, RISER_WIDTH)
        }
        // Mains: a triangle, each on its own gather point and riser.
        const bell = open > 0
        for (let i = 0; i < MAIN_COUNT; i++) {
          const m = mains.current[i]
          if (!m) continue
          m.visible = bell
          if (!bell) continue
          const b = breathe(time, i, open)
          const xz = shape.xz * b
          const ys = shape.y * (2 - b)
          const pose = mainPose(i, xz, shape.spread)
          const lift = RIM_Y * MAIN_R * ys
          m.position.set(pose.rim.x - pose.axis.x * lift, pose.rim.y - pose.axis.y * lift, pose.rim.z - pose.axis.z * lift)
          m.quaternion.setFromUnitVectors(UP, tmpA.set(pose.axis.x, pose.axis.y, pose.axis.z))
          m.scale.set(xz, ys, xz)
          const top = MAIN_R * 0.75 * ys
          apexes[i] = { x: m.position.x + pose.axis.x * top, y: m.position.y + pose.axis.y * top, z: m.position.z + pose.axis.z * top }
          for (let k = 0; k < LINES_MAIN; k++) seg(pose.gather, rimPoint(pose, k, LINES_MAIN), MAIN_LINE_WIDTH)
          seg(riserBase(i), pose.gather, RISER_WIDTH)
        }
        const pr = pilotRun(t)
        for (let i = 0; i < MAIN_COUNT; i++) {
          const m = pilots.current[i]
          if (!m) continue
          m.visible = pr !== null
          if (pr === null) continue
          const c0 = mainPose(i, canopyShape(0.3).xz, canopyShape(0.3).spread)
          const ap = apexes[i] ?? { x: c0.rim.x, y: c0.rim.y + 6, z: c0.rim.z }
          m.position.set(ap.x * pr, 1 + (ap.y + 3 - 1) * pr, ap.z * pr)
          seg(m.position, ap, DROGUE_LINE_WIDTH)
        }
        // Hide the unused instances.
        tmpM.makeScale(0, 0, 0)
        for (let k = n; k < SEGMENTS; k++) bars.setMatrixAt(k, tmpM)
        bars.instanceMatrix.needsUpdate = true
        // Remember where the mains were when the capsule touched down.
        startPos = apexes.map((_, i) => {
          const m = mains.current[i]
          return m ? { x: g.position.x + m.position.x, y: g.position.y + m.position.y, z: m.position.z } : { x: 0, y: 0, z: 0 }
        })
      }
      // Released mains: they leave the capsule at splashdown, drift to one side and settle flat on the sea.
      for (let i = 0; i < 3; i++) {
        const m = freed.current[i]
        if (!m) continue
        const show = on && t >= RELEASE_AT && startPos !== null
        m.visible = show
        if (!show || !startPos) continue
        const r = releasedAt(t, i, startPos[i])
        const ys = 1 - 0.93 * r.flat
        const xz = 1 + 0.25 * r.flat
        m.scale.set(xz, ys, xz)
        const base = r.landed ? waveY(r.pos.x, r.pos.z, time) + 0.45 - r.sunk : r.pos.y
        m.position.set(r.pos.x, r.landed ? base : r.pos.y, r.pos.z)
        m.rotation.y = i * 2.1
        m.rotation.z = r.landed ? 0 : 0.3 * (1 - r.flat) * Math.sin(time + i)
      }
    })
  }, [geo, bars])

  useEffect(
    () => () => {
      bars.dispose()
      Object.values(geo).forEach((g) => g.dispose())
      mat.canopy.map?.dispose()
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat, bars],
  )

  return (
    <>
      <group ref={group} visible={false}>
        <mesh ref={cover} geometry={geo.cover} material={mat.cover} visible={false} />
        {[0, 1].map((i) => (
          <mesh key={`d${i}`} ref={(m) => (drogues.current[i] = m)} geometry={geo.drogue} material={mat.canopy} visible={false} />
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={`p${i}`} ref={(m) => (pilots.current[i] = m)} geometry={geo.pilot} material={mat.canopy} visible={false} />
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={`m${i}`} ref={(m) => (mains.current[i] = m)} geometry={geo.main} material={mat.canopy} visible={false} frustumCulled={false} />
        ))}
        <primitive object={bars} />
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={`f${i}`} ref={(m) => (freed.current[i] = m)} geometry={geo.main} material={mat.canopy} visible={false} frustumCulled={false} />
      ))}
    </>
  )
}


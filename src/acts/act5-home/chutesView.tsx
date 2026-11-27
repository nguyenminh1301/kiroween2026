// The parachutes: the cover, two cone drogues, three pilot chutes, three mains, and the mains after release.
// One frame system reads the timeline time and poses everything; nothing here goes through React state.
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  ConeGeometry,
  DoubleSide,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerSystem } from '../../engine/frameDriver'
import {
  DROGUE_BANDS,
  DROGUE_DIAMETER,
  DROGUE_HEIGHT,
  DROGUE_LINES,
  MAIN_COUNT,
  MAIN_DIAMETER,
  MAIN_LINES,
  RELEASE_AT,
  breathe,
  canopyShape,
  coverAt,
  drogueRig,
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
const DROGUE_H = DROGUE_HEIGHT
/** Capacity of the thin lines (suspension and pilot lines) and of the risers, in segments. */
const LINE_CAP = MAIN_COUNT * MAIN_LINES + 2 * DROGUE_LINES + 3
const RISER_CAP = MAIN_COUNT + 2
const RIM_Y = 0.236

const dome = (r: number): BufferGeometry => new SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, PHI).scale(1, 0.75, 1)

/** A conical ribbon parachute: short and wide, stacked bands with gaps between them and a small closed top. Mouth at -H/2. */
function ribbonCone(radius: number, height: number, bands: number): BufferGeometry {
  const parts: BufferGeometry[] = []
  const top = 0.18
  const gap = 0.06
  for (let k = 0; k < bands; k++) {
    const u0 = k / bands + (k === 0 ? 0 : gap / bands / 2)
    const u1 = (k + 1) / bands - (k === bands - 1 ? 0 : gap / bands / 2)
    const rAt = (u: number): number => radius * (1 - (1 - top) * u)
    parts.push(new LatheGeometry([new Vector2(rAt(u0), -height / 2 + u0 * height), new Vector2(rAt(u1), -height / 2 + u1 * height)], 16))
  }
  const cap = new CircleGeometry(radius * top, 12)
  cap.rotateX(-Math.PI / 2)
  cap.translate(0, height / 2, 0)
  parts.push(cap)
  const g = mergeGeometries(parts) as BufferGeometry
  parts.forEach((x) => x.dispose())
  return g
}

/** A growing set of segments drawn as one-pixel lines. */
function lineSet(cap: number, opacity: number, color: string): { obj: LineSegments; add: (a: P, b: P) => void; begin: () => void; end: () => void } {
  const pos = new Float32Array(cap * 6)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pos, 3))
  const obj = new LineSegments(geometry, new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
  obj.frustumCulled = false
  let n = 0
  return {
    obj,
    begin: () => {
      n = 0
    },
    add: (a, b) => {
      if (n >= cap) return
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], n * 6)
      n++
    },
    end: () => {
      geometry.setDrawRange(0, n * 2)
      geometry.attributes.position.needsUpdate = true
    },
  }
}

const UP = new Vector3(0, 1, 0)
const tmpA = new Vector3()

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
      drogue: ribbonCone(DROGUE_R, DROGUE_H, DROGUE_BANDS),
      pilot: new ConeGeometry(0.7, 1.6, 8, 1, true),
      cover: new ConeGeometry(0.55, 0.6, 8),
    }),
    [],
  )
  const mat = useMemo(
    () => ({
      canopy: new MeshBasicMaterial({ map: canopyTexture(), side: DoubleSide, color: '#f2eee6' }),
      cover: new MeshBasicMaterial({ color: '#8a877d' }),
    }),
    [],
  )
  const strings = useMemo(() => lineSet(LINE_CAP, 0.5, '#e8e2d0'), [])
  const risers = useMemo(() => lineSet(RISER_CAP, 0.9, '#f4efe2'), [])

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
      strings.begin()
      risers.begin()
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
        // Drogues: a short banded cone on thin lines that meet at the confluence, then a 15 m riser to the capsule.
        const ds = drogueState(t)
        for (let s = 0; s < 2; s++) {
          const m = drogues.current[s]
          if (!m) continue
          m.visible = ds !== 'hidden'
          if (ds === 'hidden') continue
          const side = s === 0 ? -1 : 1
          const r = drogueRig(t, side)
          m.position.set(r.centre.x, r.centre.y, r.centre.z)
          m.scale.set(r.xz, r.y, r.xz)
          if (ds === 'falling') m.rotation.set(0, 0, side * 0.6)
          else m.quaternion.setFromUnitVectors(UP, tmpA.set(r.dir.x, r.dir.y, r.dir.z))
          for (let k = 0; k < DROGUE_LINES; k++) {
            const a = (k / DROGUE_LINES) * Math.PI * 2
            const c = Math.cos(a) * r.mouthRadius
            const sn = Math.sin(a) * r.mouthRadius
            // The rim plane is perpendicular to the axis: e2 in the x-y plane, e1 along z.
            strings.add({ x: r.mouth.x + r.dir.y * c, y: r.mouth.y - r.dir.x * c, z: r.mouth.z + sn }, r.confluence)
          }
          risers.add(r.confluence, r.riserEnd)
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
          for (let k = 0; k < MAIN_LINES; k++) strings.add(pose.gather, rimPoint(pose, k, MAIN_LINES))
          risers.add(riserBase(i), pose.gather)
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
          strings.add(m.position, ap)
        }
        strings.end()
        risers.end()
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
  }, [geo, strings, risers])

  useEffect(
    () => () => {
      for (const l of [strings, risers]) {
        l.obj.geometry.dispose()
        ;(l.obj.material as LineBasicMaterial).dispose()
      }
      Object.values(geo).forEach((g) => g.dispose())
      mat.canopy.map?.dispose()
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat, strings, risers],
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
        <primitive object={strings.obj} />
        <primitive object={risers.obj} />
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={`f${i}`} ref={(m) => (freed.current[i] = m)} geometry={geo.main} material={mat.canopy} visible={false} frustumCulled={false} />
      ))}
    </>
  )
}


// The parachutes: the cover, two cone drogues, three pilot chutes, three mains, and the mains after release.
// One frame system reads the timeline time and poses everything; nothing here goes through React state.
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  SphereGeometry,
  type Group,
  type Mesh,
} from 'three'
import { registerSystem } from '../../engine/frameDriver'
import {
  MAIN_HEIGHT,
  RELEASE_AT,
  breathe,
  canopyShape,
  coverAt,
  drogueFill,
  droguePos,
  drogueState,
  mainsOpen,
  openingJerk,
  pilotRun,
  releasedAt,
  sway,
} from './chutes'
import { act5State } from './state'
import { canopyTexture } from './textures'
import { capsuleY, SPLASH_AT } from './timeline'
import { waveY } from './waves'

const PRIORITY = 662
const PHI = 1.25
const MAIN_R = 11
const DROGUE_R = 1.5
const LINES_MAIN = 24
const LINES_DROGUE = 8
const RIM_Y = 0.236
/** Rim height above the capsule top for the mains. */
const RIM = MAIN_HEIGHT - 6
const ANGLES = [0, 1, 2].map((i) => Math.PI / 2 + (i * Math.PI * 2) / 3)

const dome = (r: number): BufferGeometry => new SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, PHI).scale(1, 0.75, 1)

export function Chutes() {
  const group = useRef<Group>(null)
  const cover = useRef<Mesh>(null)
  const drogues = useRef<Array<Mesh | null>>([])
  const pilots = useRef<Array<Mesh | null>>([])
  const mains = useRef<Array<Mesh | null>>([])
  const freed = useRef<Array<Mesh | null>>([])

  const geo = useMemo(() => {
    const lineGeo = new BufferGeometry()
    const count = 3 * LINES_MAIN * 2 + 2 * LINES_DROGUE * 2 + 3 * 2
    lineGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3))
    return {
      main: dome(MAIN_R),
      drogue: new ConeGeometry(DROGUE_R, 3.4, 10, 1, true),
      pilot: new ConeGeometry(0.7, 1.6, 8, 1, true),
      cover: new ConeGeometry(0.55, 0.6, 8),
      lines: lineGeo,
    }
  }, [])
  const mat = useMemo(
    () => ({
      canopy: new MeshBasicMaterial({ map: canopyTexture(), side: DoubleSide, color: '#f2eee6' }),
      cover: new MeshBasicMaterial({ color: '#8a877d' }),
      line: new LineBasicMaterial({ color: '#d8d4c8' }),
    }),
    [],
  )

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
      const pos = geo.lines.attributes.position as BufferAttribute
      let n = 0
      const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): void => {
        pos.setXYZ(n++, ax, ay, az)
        pos.setXYZ(n++, bx, by, bz)
      }
      const open = mainsOpen(t)
      const shape = canopyShape(open)
      const apexes: Array<[number, number, number]> = []
      if (aloft) {
        const c = coverAt(t)
        if (cover.current) {
          cover.current.visible = c !== null
          if (c) {
            cover.current.position.set(c.pos.x, c.pos.y, c.pos.z)
            cover.current.rotation.set(c.spin, 0, c.spin * 0.7)
          }
        }
        const ds = drogueState(t)
        const fill = drogueFill(t)
        for (let s = 0; s < 2; s++) {
          const m = drogues.current[s]
          if (!m) continue
          m.visible = ds !== 'hidden'
          if (ds === 'hidden') continue
          const side = s === 0 ? -1 : 1
          const p = droguePos(t, side)
          const stream = Math.min(1, fill)
          m.position.set(p.x, p.y, p.z)
          m.scale.set(0.18 + 0.82 * stream * (fill > 1 ? fill : 1), 1.5 - 0.5 * stream, 0.18 + 0.82 * stream * (fill > 1 ? fill : 1))
          m.rotation.z = ds === 'falling' ? side * 0.6 : 0
          const mouthY = p.y - 1.7 * m.scale.y
          const rr = DROGUE_R * m.scale.x
          for (let k = 0; k < LINES_DROGUE; k++) {
            const a = (k / LINES_DROGUE) * Math.PI * 2
            seg(0, 0, 0, p.x + Math.cos(a) * rr, mouthY, p.z + Math.sin(a) * rr)
          }
        }
        // Mains.
        const bell = open > 0
        for (let i = 0; i < 3; i++) {
          const m = mains.current[i]
          if (!m) continue
          m.visible = bell
          if (!bell) continue
          const b = breathe(time, i, open)
          const xz = shape.xz * b
          const ys = shape.y * (2 - b)
          const rimY = RIM
          const cy = rimY - RIM_Y * MAIN_R * ys
          const cx = Math.cos(ANGLES[i]) * 9 * shape.spread
          const cz = Math.sin(ANGLES[i]) * 9 * shape.spread
          m.position.set(cx, cy, cz)
          m.scale.set(xz, ys, xz)
          apexes[i] = [cx, cy + MAIN_R * 0.75 * ys, cz]
          const rimR = MAIN_R * Math.sin(PHI) * xz
          for (let k = 0; k < LINES_MAIN; k++) {
            const a = (k / LINES_MAIN) * Math.PI * 2
            seg(0, 0, 0, cx + Math.cos(a) * rimR, rimY, cz + Math.sin(a) * rimR)
          }
        }
        const pr = pilotRun(t)
        for (let i = 0; i < 3; i++) {
          const m = pilots.current[i]
          if (!m) continue
          m.visible = pr !== null
          if (pr === null) continue
          const ap = apexes[i] ?? [Math.cos(ANGLES[i]) * 2, RIM + 6, Math.sin(ANGLES[i]) * 2]
          const tx = ap[0]
          const ty = ap[1] + 3
          const tz = ap[2]
          m.position.set(tx * pr, 1 + (ty - 1) * pr, tz * pr)
          seg(m.position.x, m.position.y, m.position.z, ap[0], ap[1], ap[2])
        }
        // Keep the line buffer's unused tail from drawing stale segments.
        for (let k = n; k < pos.count; k++) pos.setXYZ(k, 0, 0, 0)
        pos.needsUpdate = true
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
  }, [geo])

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      mat.canopy.map?.dispose()
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat],
  )

  const lineObj = useMemo(() => new LineSegments(geo.lines, mat.line), [geo, mat])
  lineObj.frustumCulled = false
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
        <primitive object={lineObj} />
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={`f${i}`} ref={(m) => (freed.current[i] = m)} geometry={geo.main} material={mat.canopy} visible={false} frustumCulled={false} />
      ))}
    </>
  )
}


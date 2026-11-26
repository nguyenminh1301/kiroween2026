// The recovery ships and the raft, built from boxes and extruded outlines. Drawn inside the ocean set.
// USS Hornet: a grey flat-top about 270 m long, bow toward +x, island on the starboard (+z) side.
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { act5State } from './state'
import { escortAt, ESCORTS, HORNET_OFFSET, SPLASH_AT } from './timeline'
import { waveY } from './waves'

export const HORNET_LENGTH = 270
const DECK_Y = 15.2

/** An outline in the (x, z) plane, bow at +x, extruded up from `y0` by `depth`. */
function hullGeo(length: number, beam: number, bowLen: number, y0: number, depth: number): BufferGeometry {
  const h = length / 2
  const w = beam / 2
  const s = new Shape()
  s.moveTo(-h, -w)
  s.lineTo(h - bowLen, -w)
  s.quadraticCurveTo(h - bowLen * 0.25, -w * 0.7, h, 0)
  s.quadraticCurveTo(h - bowLen * 0.25, w * 0.7, h - bowLen, w)
  s.lineTo(-h, w)
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: false, steps: 1 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

function foamGeo(points: Array<[number, number]>): BufferGeometry {
  const s = new Shape()
  points.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, z) : s.lineTo(x, z)))
  s.closePath()
  const g = new ShapeGeometry(s)
  g.rotateX(-Math.PI / 2)
  return g
}

/** Flight deck paint: edge lines, a dashed centre line, two lifts and a big 12 near the bow. 256 px wide. */
function deckTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const x = c.getContext('2d')
  if (x) {
    x.fillStyle = '#41464b'
    x.fillRect(0, 0, 256, 64)
    x.fillStyle = '#4b5156'
    for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 1, 64)
    x.fillStyle = '#f2efe4'
    x.fillRect(0, 2, 256, 1)
    x.fillRect(0, 61, 256, 1)
    for (let i = 8; i < 200; i += 16) x.fillRect(i, 31, 9, 2)
    // Lifts.
    x.strokeStyle = '#d8d4c4'
    x.lineWidth = 1
    x.strokeRect(70, 8, 22, 14)
    x.strokeRect(150, 42, 22, 14)
    // The number, painted with its top toward the bow and stretched back to square.
    x.save()
    x.translate(222, 32)
    x.rotate(Math.PI / 2)
    x.scale(1.45, 1)
    x.fillStyle = '#f6f3ea'
    x.font = 'bold 30px sans-serif'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText('12', 0, 0)
    x.restore()
  }
  const t = new CanvasTexture(c)
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.colorSpace = SRGBColorSpace
  return t
}

const lam = (color: string, emissive = '#1c2024'): MeshLambertMaterial => new MeshLambertMaterial({ color, emissive })

export function Hornet() {
  const radar = useRef<Mesh>(null)
  const geo = useMemo(() => {
    const L = HORNET_LENGTH
    return {
      low: hullGeo(L, 30, 70, -3, 5),
      high: hullGeo(L, 30, 70, 2, 12.4),
      deck: new BoxGeometry(L + 2, 1.2, 44).translate(0, DECK_Y - 0.6, 0),
      paint: new PlaneGeometry(L, 44).rotateX(-Math.PI / 2).translate(0, DECK_Y + 0.05, 0),
      sponson: new BoxGeometry(70, 3, 7).translate(-30, 11.5, -19),
      island: new BoxGeometry(32, 15, 8).translate(12, DECK_Y + 7.5, 19),
      bridge: new BoxGeometry(18, 6, 8.4).translate(14, DECK_Y + 18, 19),
      funnel: new BoxGeometry(10, 10, 6).translate(-8, DECK_Y + 5 + 10, 19),
      funnelTop: new BoxGeometry(10.4, 1.4, 6.4).translate(-8, DECK_Y + 15.5, 19),
      mast: new BoxGeometry(1.2, 24, 1.2).translate(16, DECK_Y + 33, 19),
      yard: new BoxGeometry(0.8, 0.8, 10).translate(16, DECK_Y + 36, 19),
      radar: new BoxGeometry(9, 1.2, 0.6),
      bowFoam: foamGeo([[HORNET_LENGTH / 2 + 6, 0], [HORNET_LENGTH / 2 - 20, 12], [HORNET_LENGTH / 2 - 70, 19], [HORNET_LENGTH / 2 - 70, 15], [HORNET_LENGTH / 2 - 20, 7], [HORNET_LENGTH / 2 - 2, 1.5]]),
      bowFoam2: foamGeo([[HORNET_LENGTH / 2 + 6, 0], [HORNET_LENGTH / 2 - 20, -12], [HORNET_LENGTH / 2 - 70, -19], [HORNET_LENGTH / 2 - 70, -15], [HORNET_LENGTH / 2 - 20, -7], [HORNET_LENGTH / 2 - 2, -1.5]]),
      wake: foamGeo([[-HORNET_LENGTH / 2, -12], [-HORNET_LENGTH / 2 - 170, -34], [-HORNET_LENGTH / 2 - 170, 34], [-HORNET_LENGTH / 2, 12]]),
    }
  }, [])
  const mat = useMemo(
    () => ({
      low: lam('#2c3236'),
      high: lam('#6f777e', '#2a2e32'),
      deck: lam('#3a3f44'),
      paint: new MeshBasicMaterial({ map: deckTexture(), fog: true }),
      island: lam('#8a9096', '#30343a'),
      dark: lam('#34393e'),
      foam: new MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.8, depthWrite: false, side: DoubleSide }),
      wake: new MeshBasicMaterial({ color: '#e6eef2', transparent: true, opacity: 0.4, depthWrite: false, side: DoubleSide }),
    }),
    [],
  )
  useEffect(() => registerSystem('act5-radar', 660, (_dt, time) => {
    if (radar.current) radar.current.rotation.y = time * 2.4
  }), [])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      mat.paint.map?.dispose()
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat],
  )
  return (
    <group position={[HORNET_OFFSET.x, 0, HORNET_OFFSET.z]}>
      <mesh geometry={geo.low} material={mat.low} />
      <mesh geometry={geo.high} material={mat.high} />
      <mesh geometry={geo.sponson} material={mat.high} />
      <mesh geometry={geo.deck} material={mat.deck} />
      <mesh geometry={geo.paint} material={mat.paint} />
      <mesh geometry={geo.island} material={mat.island} />
      <mesh geometry={geo.bridge} material={mat.island} />
      <mesh geometry={geo.funnel} material={mat.island} />
      <mesh geometry={geo.funnelTop} material={mat.dark} />
      <mesh geometry={geo.mast} material={mat.dark} />
      <mesh geometry={geo.yard} material={mat.dark} />
      <mesh ref={radar} geometry={geo.radar} material={mat.dark} position={[16, DECK_Y + 46, 19]} />
      <mesh geometry={geo.bowFoam} material={mat.foam} position={[0, 0.7, 0]} />
      <mesh geometry={geo.bowFoam2} material={mat.foam} position={[0, 0.7, 0]} />
      <mesh geometry={geo.wake} material={mat.wake} position={[0, 0.6, 0]} />
    </group>
  )
}

/** A destroyer about 120 m long: narrow hull, bridge, two funnels, a mast and a forward gun. Bow toward +x. */
export function Escorts() {
  const roots = useRef<Array<Group | null>>([])
  const geo = useMemo(
    () => ({
      low: hullGeo(120, 13, 38, -2, 3.5),
      high: hullGeo(120, 13, 38, 1.5, 7.5),
      bridge: new BoxGeometry(14, 6, 8).translate(18, 12, 0),
      bridge2: new BoxGeometry(8, 4, 6).translate(26, 17, 0),
      house: new BoxGeometry(22, 4, 9).translate(-8, 11, 0),
      funnel: new CylinderGeometry(2.1, 2.5, 8, 8),
      cap: new CylinderGeometry(2.2, 2.2, 1, 8),
      mast: new BoxGeometry(0.8, 16, 0.8).translate(18, 23, 0),
      yard: new BoxGeometry(0.6, 0.6, 8).translate(18, 26, 0),
      gun: new CylinderGeometry(2.4, 2.6, 2, 8).translate(40, 10, 0),
      barrel: new BoxGeometry(5, 0.6, 0.6).translate(43, 11.2, 0),
      foam: foamGeo([[63, 0], [40, 6], [10, 9], [10, 7], [40, 3.5]]),
      foam2: foamGeo([[63, 0], [40, -6], [10, -9], [10, -7], [40, -3.5]]),
    }),
    [],
  )
  const mat = useMemo(
    () => ({
      low: lam('#2c3236'),
      high: lam('#7a8187', '#30353a'),
      house: lam('#9aa0a5', '#3c4146'),
      dark: lam('#34393e'),
      foam: new MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide }),
    }),
    [],
  )
  useEffect(
    () =>
      registerSystem('act5-escorts', 660, () => {
        const t = act5State.t
        ESCORTS.forEach((_e, i) => {
          const g = roots.current[i]
          if (!g) return
          const p = escortAt(i, t)
          g.position.set(p.x, 0, p.z)
          g.rotation.y = p.yaw + Math.PI / 2
        })
      }),
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
    <>
      {ESCORTS.map((e, i) => (
        <group key={i} ref={(g) => (roots.current[i] = g)} position={[e.x, 0, e.z]}>
          <mesh geometry={geo.low} material={mat.low} />
          <mesh geometry={geo.high} material={mat.high} />
          <mesh geometry={geo.bridge} material={mat.house} />
          <mesh geometry={geo.bridge2} material={mat.house} />
          <mesh geometry={geo.house} material={mat.house} />
          <mesh geometry={geo.funnel} material={mat.dark} position={[-2, 13, 0]} />
          <mesh geometry={geo.cap} material={mat.dark} position={[-2, 17.4, 0]} />
          <mesh geometry={geo.funnel} material={mat.dark} position={[-16, 13, 0]} />
          <mesh geometry={geo.cap} material={mat.dark} position={[-16, 17.4, 0]} />
          <mesh geometry={geo.mast} material={mat.dark} />
          <mesh geometry={geo.yard} material={mat.dark} />
          <mesh geometry={geo.gun} material={mat.dark} />
          <mesh geometry={geo.barrel} material={mat.dark} />
          <mesh geometry={geo.foam} material={mat.foam} position={[0, 0.7, 0]} />
          <mesh geometry={geo.foam2} material={mat.foam} position={[0, 0.7, 0]} />
        </group>
      ))}
    </>
  )
}

const RAFT_AT = SPLASH_AT + 4
const SWIM_AT = SPLASH_AT + 8
const SWIMMERS = 3

/** A small orange and grey inflatable raft with swimmers beside the capsule once it floats. */
export function Raft() {
  const raft = useRef<Group>(null)
  const swimmers = useRef<Array<Group | null>>([])
  const geo = useMemo(
    () => ({
      tube: new TorusGeometry(1.5, 0.3, 6, 14).rotateX(Math.PI / 2).scale(1, 1, 0.7),
      floor: new SphereGeometry(1.4, 10, 3, 0, Math.PI * 2, 0, 0.4).scale(1, 0.15, 0.7),
      bench: new BoxGeometry(2.2, 0.15, 0.3),
      head: new IcosahedronGeometry(0.22, 1),
      body: new BoxGeometry(0.5, 0.22, 0.75),
    }),
    [],
  )
  const mat = useMemo(
    () => ({ orange: lam('#e8631a', '#5a2408'), grey: lam('#7d848a'), helmet: lam('#f2f2ee', '#44443f'), suit: lam('#e07a1c', '#4a2406') }),
    [],
  )
  useEffect(
    () =>
      registerSystem('act5-raft', 660, (_dt, time) => {
        const t = act5State.t
        const r = raft.current
        if (r) {
          r.visible = t >= RAFT_AT
          // It nudges in toward the capsule.
          const k = Math.min(1, (t - RAFT_AT) / 8)
          const x = 14 - 7 * k
          const z = -11 + 5.5 * k
          r.position.set(x, waveY(x, z, time) + 0.1, z)
          r.rotation.y = 0.6 + 0.1 * Math.sin(time * 0.5)
          r.rotation.z = 0.05 * Math.sin(time * 0.9)
        }
        for (let i = 0; i < SWIMMERS; i++) {
          const g = swimmers.current[i]
          if (!g) continue
          g.visible = t >= SWIM_AT
          const a = 1.2 + i * 0.9
          const k = Math.min(1, (t - SWIM_AT) / 5)
          const rad = 6.5 - 3.2 * k
          const x = Math.cos(a) * rad
          const z = Math.sin(a) * rad
          g.position.set(x, waveY(x, z, time) - 0.12, z)
          g.rotation.y = -a + Math.PI / 2
          g.rotation.x = 0.05 * Math.sin(time * 1.3 + i)
        }
      }),
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
    <>
      <group ref={raft} visible={false}>
        <mesh geometry={geo.tube} material={mat.orange} position={[0, 0.25, 0]} />
        <mesh geometry={geo.floor} material={mat.grey} position={[0, 0.1, 0]} />
        <mesh geometry={geo.bench} material={mat.grey} position={[0, 0.5, 0.2]} />
        <mesh geometry={geo.head} material={mat.helmet} position={[-0.5, 0.75, 0.3]} />
        <mesh geometry={geo.head} material={mat.helmet} position={[0.5, 0.75, 0.3]} />
      </group>
      {Array.from({ length: SWIMMERS }, (_, i) => (
        <group key={i} ref={(g) => (swimmers.current[i] = g)} visible={false}>
          <mesh geometry={geo.body} material={mat.suit} />
          <mesh geometry={geo.head} material={mat.helmet} position={[0, 0.12, 0.45]} />
        </group>
      ))}
    </>
  )
}

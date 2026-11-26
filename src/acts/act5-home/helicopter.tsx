// The Sikorsky SH-3 Sea King, helicopter 66: a boat-shaped hull, cockpit glass at the nose, side floats on
// stubs at the main wheels, a tall tail with a five-blade tail rotor on the left, a five-blade main rotor
// and a faint blur disc. It flies from the carrier to a hover by the capsule and its downwash ruffles the sea.
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three'
import { HUD } from '../../content/hud'
import { registerSystem } from '../../engine/frameDriver'
import { heliPos, heliProgress, heliYaw } from './heli'
import { act5State } from './state'
import { markTexture } from './textures'
import { waveY } from './waves'

const WHITE = '#f4f4f0'
const GREY = '#bcc2c6'
const ROTOR_Y = 3.15
const SPRAY = 36

/** The hull: a rounded fuselage, white above the waterline stripe and light grey below, like a boat. */
function hullGeo(): BufferGeometry {
  const g = new CapsuleGeometry(1.35, 6.4, 4, 14)
  g.rotateX(Math.PI / 2)
  g.scale(1, 1.05, 1)
  const pos = g.attributes.position
  const col = new Float32Array(pos.count * 3)
  const top = new Color(WHITE)
  const low = new Color(GREY)
  for (let i = 0; i < pos.count; i++) {
    const c = pos.getY(i) > -0.35 ? top : low
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  return g
}

export function Helicopter() {
  const root = useRef<Group>(null)
  const rotor = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const spray = useRef<InstancedMesh>(null)
  const foam = useRef<Mesh>(null)
  const geo = useMemo(
    () => ({
      hull: hullGeo(),
      glass: new BoxGeometry(1.9, 0.75, 1.3).translate(0, 0.5, 3.55),
      sideGlass: new BoxGeometry(2.8, 0.55, 0.9).translate(0, 0.55, 2.55),
      housing: new BoxGeometry(1.9, 0.95, 3.2).translate(0, 1.85, 0.4),
      mast: new CylinderGeometry(0.16, 0.2, 0.7, 8).translate(0, 2.9, 0.4),
      hub: new CylinderGeometry(0.42, 0.42, 0.22, 10).translate(0, ROTOR_Y, 0.4),
      blade: new BoxGeometry(0.42, 0.06, 8.7).translate(0, 0, 4.6),
      blur: new CircleGeometry(9.3, 28).rotateX(-Math.PI / 2),
      boom: new CylinderGeometry(0.34, 0.8, 6.2, 8).rotateX(Math.PI / 2).translate(0, 0.45, -6.5),
      pylon: new BoxGeometry(0.4, 3.4, 1.6),
      tailBlade: new BoxGeometry(0.05, 1.7, 0.2).translate(0, 0.95, 0),
      stub: new BoxGeometry(1.0, 0.22, 0.36),
      float: new CapsuleGeometry(0.5, 2.4, 3, 8).rotateX(Math.PI / 2),
      wheel: new CylinderGeometry(0.4, 0.4, 0.26, 10).rotateZ(Math.PI / 2),
      plane: new PlaneGeometry(2.4, 1.2),
      planeSmall: new PlaneGeometry(1.4, 0.7),
      planeTail: new PlaneGeometry(1.9, 0.95),
      foam: new RingGeometry(5, 13, 40),
      spray: new IcosahedronGeometry(0.4, 0),
    }),
    [],
  )
  const mat = useMemo(
    () => ({
      hull: new MeshLambertMaterial({ vertexColors: true, emissive: '#2a2c2e' }),
      white: new MeshLambertMaterial({ color: WHITE, emissive: '#2a2c2e' }),
      grey: new MeshLambertMaterial({ color: GREY, emissive: '#26292b' }),
      glass: new MeshLambertMaterial({ color: '#1b2c3d', emissive: '#0c1822' }),
      blade: new MeshLambertMaterial({ color: '#25282b' }),
      blur: new MeshBasicMaterial({ color: '#c9ced2', transparent: true, opacity: 0.11, depthWrite: false, side: DoubleSide }),
      foam: new MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.22, depthWrite: false, side: DoubleSide }),
      spray: new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }),
    }),
    [],
  )
  const marks = useMemo(() => {
    const n66 = markTexture(HUD.heliMarkings.number)
    const navy = markTexture(HUD.heliMarkings.name)
    const mk = (map: ReturnType<typeof markTexture>): MeshBasicMaterial => new MeshBasicMaterial({ map, transparent: true, side: DoubleSide, fog: true })
    return { n66, navy, m66: mk(n66), mNavy: mk(navy) }
  }, [])

  useEffect(() => {
    const mx = new Matrix4()
    const q = new Quaternion()
    const p = new Vector3()
    const s = new Vector3()
    return registerSystem('act5-heli', 660, (_dt, time) => {
      const g = root.current
      if (!g) return
      const t = act5State.t
      const pr = heliProgress(t)
      g.visible = t >= 46
      const pos = heliPos(t)
      g.position.set(pos.x, pos.y + Math.sin(time * 1.7) * 0.15 * pr, pos.z)
      g.rotation.y = heliYaw(t)
      // Nose down while it flies, level at the hover.
      g.rotation.x = (1 - pr) * pr * 0.5
      if (rotor.current) rotor.current.rotation.y = time * 17
      if (tail.current) tail.current.rotation.x = time * 40
      // Downwash: a ring of spray and a pale disc of ruffled water under the hover point.
      const hover = t >= 46 && pr > 0.9
      const sm = spray.current
      if (sm) sm.visible = hover
      if (foam.current) {
        foam.current.visible = hover
        foam.current.position.set(pos.x, waveY(pos.x, pos.z, time) + 0.35, pos.z)
        foam.current.rotation.set(-Math.PI / 2, 0, time * 0.8)
        const k = 1 + 0.06 * Math.sin(time * 5)
        foam.current.scale.set(k, k, 1)
      }
      if (sm && hover) {
        for (let i = 0; i < SPRAY; i++) {
          const a = (i / SPRAY) * Math.PI * 2 + time * 0.4
          const u = (time * 0.9 + i * 0.37) % 1
          const r = 4.5 + 8.5 * u
          const x = pos.x + Math.cos(a) * r
          const z = pos.z + Math.sin(a) * r
          p.set(x, waveY(x, z, time) + 0.3 + 1.7 * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(i * 1.7)), z)
          s.setScalar(0.4 + 0.9 * (1 - u) * (0.7 + 0.3 * Math.sin(i * 2.3)))
          mx.compose(p, q, s)
          sm.setMatrixAt(i, mx)
        }
        sm.instanceMatrix.needsUpdate = true
      }
    })
  }, [])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      Object.values(mat).forEach((m) => m.dispose())
      marks.n66.dispose()
      marks.navy.dispose()
      marks.m66.dispose()
      marks.mNavy.dispose()
    },
    [geo, mat, marks],
  )
  return (
    <>
      <group ref={root} visible={false}>
        <mesh geometry={geo.hull} material={mat.hull} />
        <mesh geometry={geo.glass} material={mat.glass} />
        <mesh geometry={geo.sideGlass} material={mat.glass} />
        <mesh geometry={geo.housing} material={mat.white} />
        <mesh geometry={geo.boom} material={mat.white} />
        <mesh geometry={geo.mast} material={mat.blade} />
        {/* Side floats on short stubs, with the main wheels under them. */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh geometry={geo.stub} material={mat.white} position={[side * 1.5, -0.5, 0.5]} />
            <mesh geometry={geo.float} material={mat.white} position={[side * 2.15, -0.6, 0.5]} />
            <mesh geometry={geo.wheel} material={mat.blade} position={[side * 2.15, -1.15, 0.45]} />
          </group>
        ))}
        {/* Markings: 66 large on the side and on the nose, NAVY on the tall tail. */}
        <mesh geometry={geo.plane} material={marks.m66} position={[1.39, 0.15, -0.9]} rotation={[0, Math.PI / 2, 0]} />
        <mesh geometry={geo.plane} material={marks.m66} position={[-1.39, 0.15, -0.9]} rotation={[0, -Math.PI / 2, 0]} />
        <mesh geometry={geo.planeSmall} material={marks.m66} position={[1.0, 0.7, 2.6]} rotation={[0, Math.PI / 2, 0]} />
        <mesh geometry={geo.planeSmall} material={marks.m66} position={[-1.0, 0.7, 2.6]} rotation={[0, -Math.PI / 2, 0]} />
        <mesh geometry={geo.planeSmall} material={marks.m66} position={[0, 1.44, 2.2]} rotation={[-Math.PI / 2, 0, 0]} />
        <group position={[0, 2.35, -9.4]} rotation={[-0.32, 0, 0]}>
          <mesh geometry={geo.pylon} material={mat.white} />
          <mesh geometry={geo.planeTail} material={marks.mNavy} position={[0.21, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
          <mesh geometry={geo.planeTail} material={marks.mNavy} position={[-0.21, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        </group>
        {/* Main rotor: five spinning blades and a faint blur disc. */}
        <mesh geometry={geo.hub} material={mat.blade} />
        <group ref={rotor} position={[0, ROTOR_Y, 0.4]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} geometry={geo.blade} material={mat.blade} position={[0, 0, 0]} rotation={[0, (i * Math.PI * 2) / 5, 0]} />
          ))}
        </group>
        <mesh geometry={geo.blur} material={mat.blur} position={[0, ROTOR_Y + 0.02, 0.4]} />
        {/* Tail rotor, five blades, on the left side of the tail. */}
        <group ref={tail} position={[0.45, 3.7, -9.9]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} geometry={geo.tailBlade} material={mat.blade} rotation={[(i * Math.PI * 2) / 5, 0, 0]} />
          ))}
        </group>
      </group>
      <mesh ref={foam} geometry={geo.foam} material={mat.foam} visible={false} frustumCulled={false} />
      <instancedMesh ref={spray} args={[geo.spray, mat.spray, SPRAY]} visible={false} frustumCulled={false} />
    </>
  )
}

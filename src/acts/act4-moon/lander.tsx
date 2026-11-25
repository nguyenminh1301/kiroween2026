// The lunar module, its engine plumes, the dust sheet, the task props and the carried item.
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { FLAG_KIT, SCOOP_SPOT, SEISMO_KIT, STAGE_BOTTOM, STAGE_TOP } from './layout'
import {
  buildAscent,
  buildBag,
  buildDescentBody,
  buildFlag,
  buildFlagKit,
  buildLegs,
  buildScoop,
  buildSeismo,
} from './landerGeo'
import { act4State } from './state'
import { SITES, groundAt } from './terrain'

const LANDER_PRIORITY = 650

const glow = (color: string, opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })

export function Lander() {
  const mat = useMemo(() => {
    const m = createMaterial({ vertexColors: true })
    m.side = DoubleSide
    return m
  }, [])
  const geos = useMemo(
    () => ({
      body: buildDescentBody(),
      legs: buildLegs(),
      ascent: buildAscent(),
      flag: buildFlag(),
      flagKit: buildFlagKit(),
      scoop: buildScoop(),
      bag: buildBag(),
      seismo: buildSeismo(),
      plume: (() => {
        const g = new ConeGeometry(0.5, 1, 10, 1, true)
        g.rotateX(Math.PI)
        g.translate(0, -0.5, 0)
        return g
      })(),
      fire: (() => {
        const g = new ConeGeometry(1, 1, 12, 1, true)
        g.translate(0, 0.5, 0)
        return g
      })(),
      dust: new RingGeometry(0.5, 1, 28),
    }),
    [],
  )
  const mats = useMemo(
    () => ({
      plume: glow('#a8c4ff', 0.7),
      plumeCore: glow('#ffffff', 0.9),
      fire: glow('#ffb347', 0.75),
      fireCore: glow('#ffffff', 0.9),
      dust: new MeshBasicMaterial({ color: '#cfc8b4', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, fog: false }),
    }),
    [],
  )

  const root = useRef<Group>(null)
  const ascent = useRef<Group>(null)
  const plume = useRef<Group>(null)
  const fire = useRef<Group>(null)
  const dust = useRef<Mesh>(null)
  const flag = useRef<Group>(null)
  const bag = useRef<Mesh>(null)
  const seismo = useRef<Mesh>(null)
  const kitFlag = useRef<Mesh>(null)
  const kitScoop = useRef<Mesh>(null)
  const kitSeismo = useRef<Mesh>(null)
  const held = useRef<Group>(null)
  const heldFlag = useRef<Mesh>(null)
  const heldScoop = useRef<Mesh>(null)
  const heldSeismo = useRef<Mesh>(null)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const off = new Vector3()
    return registerSystem('act4-lander', LANDER_PRIORITY, (_dt, t) => {
      const s = act4State
      if (root.current) root.current.position.y = s.landerY
      if (ascent.current) ascent.current.position.y = s.ascentRise
      const flick = 0.92 + Math.sin(t * 40) * 0.08
      if (plume.current) {
        plume.current.visible = s.plume
        const len = Math.min(7, 3 + s.landerY * 0.4, s.landerY + 0.4) * flick
        plume.current.scale.set(1.3, Math.max(0.2, len), 1.3)
        plume.current.position.y = STAGE_BOTTOM - 0.4
      }
      if (dust.current) {
        dust.current.visible = s.dust > 0
        const r = 3 + s.dust * 15
        dust.current.scale.set(r, r, 1)
        mats.dust.opacity = 0.45 * s.dust
      }
      if (fire.current) {
        fire.current.visible = s.fire > 0
        const h = Math.max(0.5, 0.6 + s.ascentRise * 0.7) * (0.9 + 0.1 * Math.sin(t * 50))
        const r = 2.4 * (0.5 + 0.5 * s.fire)
        fire.current.scale.set(r, h, r)
        fire.current.position.y = STAGE_TOP + 0.02
        mats.fire.opacity = 0.75 * Math.min(1, s.fire * 2)
        mats.fireCore.opacity = 0.9 * Math.min(1, s.fire * 2)
      }
      const done = s.tasks.done
      if (flag.current) {
        flag.current.visible = done.flag
        flag.current.rotation.x = s.flagTip * 1.45
      }
      if (bag.current) bag.current.visible = done.sample
      if (seismo.current) seismo.current.visible = done.seismo
      if (kitFlag.current) kitFlag.current.visible = !done.flag && s.carrying !== 'flag'
      if (kitScoop.current) kitScoop.current.visible = !done.sample && s.carrying !== 'scoop'
      if (kitSeismo.current) kitSeismo.current.visible = !done.seismo && s.carrying !== 'seismo'
      if (held.current) {
        held.current.visible = s.carrying !== null
        off.set(0.34, -0.3, -0.6).applyQuaternion(camera.quaternion).add(camera.position)
        held.current.position.copy(off)
        held.current.quaternion.copy(camera.quaternion)
        if (heldFlag.current) heldFlag.current.visible = s.carrying === 'flag'
        if (heldScoop.current) heldScoop.current.visible = s.carrying === 'scoop'
        if (heldSeismo.current) heldSeismo.current.visible = s.carrying === 'seismo'
      }
    })
  }, [camera, mats])

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose())
      Object.values(mats).forEach((m) => m.dispose())
      disposeMaterial(mat)
    },
    [geos, mats, mat],
  )

  const f = SITES.flag
  const sm = SITES.sample
  const se = SITES.seismo
  return (
    <>
      <group ref={root}>
        <mesh geometry={geos.body} material={mat} frustumCulled={false} />
        <mesh geometry={geos.legs} material={mat} frustumCulled={false} />
        <group ref={ascent}>
          <mesh geometry={geos.ascent} material={mat} frustumCulled={false} />
        </group>
        <group ref={plume} visible={false}>
          <mesh geometry={geos.plume} material={mats.plume} />
          <mesh geometry={geos.plume} material={mats.plumeCore} scale={[0.5, 1, 0.5]} />
        </group>
        <group ref={fire} visible={false}>
          <mesh geometry={geos.fire} material={mats.fire} />
          <mesh geometry={geos.fire} material={mats.fireCore} scale={[0.35, 1, 0.35]} />
        </group>
        <mesh ref={kitFlag} geometry={geos.flagKit} material={mat} position={[FLAG_KIT.x, FLAG_KIT.y, FLAG_KIT.z]} rotation={[0, 0, 0.08]} />
        <mesh ref={kitScoop} geometry={geos.scoop} material={mat} position={[SCOOP_SPOT.x, SCOOP_SPOT.y, SCOOP_SPOT.z]} />
        <mesh ref={kitSeismo} geometry={geos.seismo} material={mat} position={[SEISMO_KIT.x, SEISMO_KIT.y - 0.14, SEISMO_KIT.z]} scale={0.7} />
      </group>
      <mesh ref={dust} geometry={geos.dust} material={mats.dust} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} visible={false} />
      <group ref={flag} position={[f.x, groundAt(f.x, f.z), f.z]} visible={false}>
        <mesh geometry={geos.flag} material={mat} />
      </group>
      <mesh ref={bag} geometry={geos.bag} material={mat} position={[sm.x, groundAt(sm.x, sm.z), sm.z]} visible={false} />
      <mesh ref={seismo} geometry={geos.seismo} material={mat} position={[se.x, groundAt(se.x, se.z), se.z]} visible={false} />
      <group ref={held} visible={false}>
        <mesh ref={heldFlag} geometry={geos.flagKit} material={mat} rotation={[0.9, 0, 0.3]} scale={0.7} />
        <mesh ref={heldScoop} geometry={geos.scoop} material={mat} rotation={[0.5, 0.3, 0]} />
        <mesh ref={heldSeismo} geometry={geos.seismo} material={mat} scale={0.6} rotation={[0.3, 0.4, 0]} />
      </group>
    </>
  )
}

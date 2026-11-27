// The lunar module, its engine plumes, the dust sheet, the task props and the carried item.
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Points,
  Quaternion,
  PointsMaterial,
  RingGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { flickerScale } from '../../engine/settings'
import { gameStore } from '../../engine/store'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { ASCENT_BELL_Y, BELL_EXIT_Y, FLAG_KIT, PHOTO_SPOT, SCOOP_SPOT, SEISMO_KIT, STAGE_TOP } from './layout'
import {
  buildAscent,
  buildBag,
  buildDescentBody,
  buildFlag,
  buildFlagKit,
  buildLegs,
  buildScoop,
  buildSeismo,
  buildGlove,
  buildArm,
} from './landerGeo'
import { dustShape } from './descent'
import { PROP_SPOTS, buildInterior } from './interiorGeo'
import { faceAt } from './layout'
import { buildProp, type PropKind } from '../../procgen/cabin/props'
import { RCS_COUNT, rcsFlash, rcsMount } from './rcs'
import { BLAST_DUST, BLAST_SCRAPS, FIRE_RADIUS_TAIL, FIRE_RADIUS_TOP, blastDustAt, fireShape, scrapAt } from './liftoff'
import { act4State } from './state'
import { SITES, groundAt } from './terrain'

const LANDER_PRIORITY = 650

const DUST_POINTS = 220

const RCS_MOUNTS = Array.from({ length: RCS_COUNT }, (_, i) => {
  const m = rcsMount(i)
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(m.dir.x, m.dir.y, m.dir.z))
  return { pos: [m.pos.x, m.pos.y, m.pos.z] as [number, number, number], q }
})

const PROPS: { id: string; kind: PropKind; pos: [number, number, number]; yaw: number }[] = (
  [
    ['card', 'card'],
    ['card2', 'card'],
    ['pencil', 'pencil'],
    ['pouch', 'pouch'],
    ['camera', 'camera'],
  ] as const
).map(([id, kind]) => {
  const s = PROP_SPOTS[id]
  const p = faceAt(s.face, s.u, s.v, s.out)
  return { id, kind, pos: [p.x, p.y, p.z], yaw: ((s.face + 0.5) * Math.PI) / 3 + Math.PI }
})

const glow = (color: string, opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })

const fireMat = (color: string, opacity: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })

export function Lander() {
  const mat = useMemo(() => {
    const m = createMaterial({ vertexColors: true })
    m.side = DoubleSide
    return m
  }, [])
  // The cabin is lit warm and bright, as in acts 1 and 2.
  const matIn = useMemo(() => {
    const m = createMaterial({ vertexColors: true })
    m.side = DoubleSide
    if ('emissive' in m) m.emissive.set('#5a4a2c')
    return m
  }, [])
  const geos = useMemo(
    () => ({
      body: buildDescentBody(),
      legs: buildLegs(),
      ascent: buildAscent(),
      interior: buildInterior(),
      card: buildProp('card'),
      pencil: buildProp('pencil'),
      pouch: buildProp('pouch'),
      camera: buildProp('camera'),
      flag: buildFlag(),
      flagKit: buildFlagKit(),
      scoop: buildScoop(),
      bag: buildBag(),
      seismo: buildSeismo(),
      glove: buildGlove(),
      arm: buildArm(),
      plume: (() => {
        const g = new ConeGeometry(0.5, 1, 10, 1, true)
        g.rotateX(Math.PI)
        g.translate(0, -0.5, 0)
        return g
      })(),
      // The ascent flame: a long narrow cone, opaque at the bell, fading to nothing at the tail.
      // Unit length, hanging below the origin; vertex alpha carries the soft tail.
      fire: (() => {
        const g = new CylinderGeometry(FIRE_RADIUS_TOP, FIRE_RADIUS_TAIL, 1, 12, 8, true)
        g.translate(0, -0.5, 0)
        const pos = g.attributes.position
        const col = new Float32Array(pos.count * 4)
        for (let i = 0; i < pos.count; i++) {
          const down = -pos.getY(i)
          col.set([1, 1, 1, (1 - down) ** 1.6], i * 4)
        }
        g.setAttribute('color', new BufferAttribute(col, 4))
        return g
      })(),
      puff: (() => {
        const g = new ConeGeometry(0.07, 0.45, 6, 1, true)
        // Point along +y with the wide end away from the nozzle.
        g.translate(0, 0.225, 0)
        return g
      })(),
      blastDisc: (() => {
        const g = new CircleGeometry(1, 20)
        g.rotateX(-Math.PI / 2)
        return g
      })(),
      scraps: (() => {
        const g = new BufferGeometry()
        g.setAttribute('position', new BufferAttribute(new Float32Array(BLAST_SCRAPS * 3), 3))
        return g
      })(),
      blastDust: (() => {
        const g = new BufferGeometry()
        g.setAttribute('position', new BufferAttribute(new Float32Array(BLAST_DUST * 3), 3))
        return g
      })(),
      photoRing: (() => {
        const g = new RingGeometry(0.8, 1.0, 24)
        g.rotateX(-Math.PI / 2)
        return g
      })(),
      dust: new RingGeometry(0.7, 1, 40),
      dustWall: (() => {
        const g = new CylinderGeometry(1, 1, 1, 40, 1, true)
        g.translate(0, 0.5, 0)
        return g
      })(),
      dustPoints: (() => {
        const g = new BufferGeometry()
        g.setAttribute('position', new BufferAttribute(new Float32Array(DUST_POINTS * 3), 3))
        return g
      })(),
    }),
    [],
  )
  const mats = useMemo(
    () => ({
      plume: glow('#a8c4ff', 0.85),
      plumeCore: glow('#ffffff', 1),
      plumeHalo: glow('#7fa4ff', 0.28),
      fire: fireMat('#ffb347', 0.8),
      fireCore: fireMat('#ffffff', 0.9),
      puff: glow('#ffffff', 0.95),
      blastDisc: glow('#ffd9a0', 0.6),
      scraps: new PointsMaterial({ color: '#e8d494', size: 4, sizeAttenuation: false, fog: false }),
      blastDust: new PointsMaterial({ color: '#e4dcc6', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, fog: false }),
      ring: new MeshBasicMaterial({ color: '#E2782F', side: DoubleSide }),
      dust: new MeshBasicMaterial({ color: '#e4dcc6', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, fog: false }),
      dustWall: new MeshBasicMaterial({ color: '#d6cdb6', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, fog: false }),
      dustPoints: new PointsMaterial({ color: '#efe8d4', size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    }),
    [],
  )

  const root = useRef<Group>(null)
  const ascent = useRef<Group>(null)
  const hull = useRef<Mesh>(null)
  const inside = useRef<Group>(null)
  const plume = useRef<Group>(null)
  const fire = useRef<Group>(null)
  const puffs = useRef<(Mesh | null)[]>([])
  const blastDisc = useRef<Mesh>(null)
  const scraps = useRef<Points>(null)
  const blastDust = useRef<Points>(null)
  const dust = useRef<Mesh>(null)
  const dustWall = useRef<Mesh>(null)
  const dustPts = useRef<Points>(null)
  const flag = useRef<Group>(null)
  const photoRing = useRef<Mesh>(null)
  const bag = useRef<Mesh>(null)
  const seismo = useRef<Mesh>(null)
  const kitFlag = useRef<Mesh>(null)
  const kitScoop = useRef<Mesh>(null)
  const kitSeismo = useRef<Mesh>(null)
  const held = useRef<Group>(null)
  const hands = useRef<Group>(null)
  const handL = useRef<Mesh>(null)
  const handR = useRef<Mesh>(null)
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
      if (hull.current) hull.current.visible = !s.cabinView
      if (inside.current) inside.current.visible = s.cabinView
      const flick = 1 - 0.08 * flickerScale(gameStore.getState().settings.reducedMotion) * (1 - Math.sin(t * 40))
      if (plume.current) {
        plume.current.visible = s.plume
        const len = Math.min(7, 3 + s.landerY * 0.4, s.landerY + BELL_EXIT_Y) * flick
        plume.current.scale.set(1.3, Math.max(0.2, len), 1.3)
        plume.current.position.y = BELL_EXIT_Y
      }
      if (dust.current && dustWall.current && dustPts.current) {
        const on = s.dust > 0
        dust.current.visible = on
        dustWall.current.visible = on
        dustPts.current.visible = on
        if (on) {
          const d = dustShape(s.dust)
          const r = d.radius
          dust.current.scale.set(r, r, 1)
          dustWall.current.scale.set(r, d.height, r)
          mats.dust.opacity = d.opacity * 0.6
          mats.dustWall.opacity = d.opacity * 0.35
          mats.dustPoints.opacity = Math.min(1, d.opacity * 1.4)
          // Streaks: each grain runs outward along its own bearing and wraps back to the engine.
          const pos = geos.dustPoints.attributes.position as BufferAttribute
          for (let i = 0; i < DUST_POINTS; i++) {
            const a = i * 2.399963
            const f = (i * 0.618034 + t * (0.6 + (i % 5) * 0.12)) % 1
            const rr = 1.5 + f * (r - 1.5)
            pos.setXYZ(i, Math.cos(a) * rr, 0.08 + ((i * 7) % 11) * 0.035 * (d.height / 0.75), Math.sin(a) * rr)
          }
          pos.needsUpdate = true
        }
      }
      if ('emissive' in mat) mat.emissive.setRGB(0.32 * s.fill, 0.27 * s.fill, 0.17 * s.fill)
      if (fire.current) {
        // The flame belongs to the ascent stage: it hangs from the ascent bell and rises with it.
        fire.current.visible = s.fire > 0
        const sh = fireShape(s.fire)
        const h = sh.length * (0.96 + 0.04 * Math.sin(t * 50))
        fire.current.scale.set(sh.width, h, sh.width)
        mats.fire.opacity = 0.8 * Math.min(1, s.fire * 2)
        mats.fireCore.opacity = 0.9 * Math.min(1, s.fire * 2)
      }
      for (let i = 0; i < RCS_COUNT; i++) {
        const m = puffs.current[i]
        if (!m) continue
        const f = s.rcsRate > 0 ? rcsFlash(i, s.rcsT, s.rcsRate) : 0
        m.visible = f > 0
        if (f > 0) m.scale.set(1, 0.5 + f, 1)
      }
      if (blastDisc.current) {
        const near = Math.max(0, 1 - s.ascentRise / 5)
        blastDisc.current.visible = s.fire > 0 && near > 0
        blastDisc.current.scale.set(1.5 + s.ascentRise * 0.5, 1, 1.5 + s.ascentRise * 0.5)
        mats.blastDisc.opacity = 0.7 * near * Math.min(1, s.fire * 2)
      }
      if (scraps.current && blastDust.current) {
        const on = s.blast >= 0
        scraps.current.visible = on
        blastDust.current.visible = on
        if (on) {
          const sp = geos.scraps.attributes.position as BufferAttribute
          for (let i = 0; i < BLAST_SCRAPS; i++) {
            const p = scrapAt(i, s.blast)
            sp.setXYZ(i, p.x, p.y, p.z)
          }
          sp.needsUpdate = true
          const dp = geos.blastDust.attributes.position as BufferAttribute
          for (let i = 0; i < BLAST_DUST; i++) {
            const p = blastDustAt(i, s.blast)
            dp.setXYZ(i, p.x, p.y, p.z)
          }
          dp.needsUpdate = true
          mats.blastDust.opacity = 0.8 * Math.max(0, 1 - s.blast / 7)
        }
      }
      const done = s.tasks.done
      if (flag.current) {
        flag.current.visible = done.flag
        flag.current.rotation.x = s.flagTip * 1.45
      }
      if (photoRing.current) photoRing.current.visible = done.flag && !s.tasks.photoDone
      if (bag.current) bag.current.visible = done.sample
      if (seismo.current) seismo.current.visible = done.seismo
      if (kitFlag.current) kitFlag.current.visible = !done.flag && s.carrying !== 'flag'
      if (kitScoop.current) kitScoop.current.visible = !done.sample && s.carrying !== 'scoop'
      if (kitSeismo.current) kitSeismo.current.visible = !done.seismo && s.carrying !== 'seismo'
      if (hands.current) {
        const c = s.climb
        hands.current.visible = c.hands
        if (c.hands) {
          off.set(0, 0, 0).applyQuaternion(camera.quaternion).add(camera.position)
          hands.current.position.copy(off)
          hands.current.quaternion.copy(camera.quaternion)
          const lift = Math.sin(c.phase) * 0.09
          if (handL.current) handL.current.position.set(-0.27, -0.36 + lift, -0.55)
          if (handR.current) handR.current.position.set(0.27, -0.36 - lift, -0.55)
        }
      }
      if (held.current) {
        held.current.visible = s.carrying !== null
        off.set(0.3, -0.24, -0.6).applyQuaternion(camera.quaternion).add(camera.position)
        held.current.position.copy(off)
        held.current.quaternion.copy(camera.quaternion)
        if (heldFlag.current) heldFlag.current.visible = s.carrying === 'flag'
        if (heldScoop.current) heldScoop.current.visible = s.carrying === 'scoop'
        if (heldSeismo.current) heldSeismo.current.visible = s.carrying === 'seismo'
      }
    })
  }, [camera, mats, geos, mat])

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose())
      Object.values(mats).forEach((m) => m.dispose())
      disposeMaterial(mat)
      disposeMaterial(matIn)
    },
    [geos, mats, mat, matIn],
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
          <mesh ref={hull} geometry={geos.ascent} material={mat} frustumCulled={false} />
          <group ref={inside} visible={false}>
            <mesh geometry={geos.interior} material={matIn} frustumCulled={false} />
            {PROPS.map((p) => (
              <mesh key={p.id} geometry={geos[p.kind]} material={matIn} position={p.pos} rotation={[0, p.yaw, 0]} frustumCulled={false} />
            ))}
          </group>
          <group ref={fire} visible={false} position={[0, ASCENT_BELL_Y, 0]}>
            <mesh geometry={geos.fire} material={mats.fire} />
            <mesh geometry={geos.fire} material={mats.fireCore} scale={[0.4, 1, 0.4]} />
          </group>
          {RCS_MOUNTS.map((m, i) => (
            <mesh key={i} ref={(o) => (puffs.current[i] = o)} geometry={geos.puff} material={mats.puff} position={m.pos} quaternion={m.q} visible={false} frustumCulled={false} />
          ))}
        </group>
        <mesh ref={blastDisc} geometry={geos.blastDisc} material={mats.blastDisc} position={[0, STAGE_TOP + 0.04, 0]} visible={false} frustumCulled={false} />
        <group ref={plume} visible={false}>
          <mesh geometry={geos.plume} material={mats.plume} />
          <mesh geometry={geos.plume} material={mats.plumeCore} scale={[0.5, 1, 0.5]} />
          <mesh geometry={geos.plume} material={mats.plumeHalo} scale={[1.9, 1.15, 1.9]} />
        </group>
        <mesh ref={kitFlag} geometry={geos.flagKit} material={mat} position={[FLAG_KIT.x, FLAG_KIT.y, FLAG_KIT.z]} rotation={[0, 0, 0.08]} />
        <mesh ref={kitScoop} geometry={geos.scoop} material={mat} position={[SCOOP_SPOT.x, SCOOP_SPOT.y, SCOOP_SPOT.z]} />
        <mesh ref={kitSeismo} geometry={geos.seismo} material={mat} position={[SEISMO_KIT.x, SEISMO_KIT.y - 0.14, SEISMO_KIT.z]} scale={0.7} />
      </group>
      <mesh ref={dust} geometry={geos.dust} material={mats.dust} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} visible={false} frustumCulled={false} />
      <mesh ref={dustWall} geometry={geos.dustWall} material={mats.dustWall} position={[0, 0.05, 0]} visible={false} frustumCulled={false} />
      <points ref={scraps} geometry={geos.scraps} material={mats.scraps} visible={false} frustumCulled={false} />
      <points ref={blastDust} geometry={geos.blastDust} material={mats.blastDust} visible={false} frustumCulled={false} />
      <points ref={dustPts} geometry={geos.dustPoints} material={mats.dustPoints} visible={false} frustumCulled={false} />
      <group ref={flag} position={[f.x, groundAt(f.x, f.z), f.z]} visible={false}>
        <mesh geometry={geos.flag} material={mat} />
      </group>
      <mesh ref={photoRing} geometry={geos.photoRing} material={mats.ring} position={[PHOTO_SPOT.x, groundAt(PHOTO_SPOT.x, PHOTO_SPOT.z) + 0.06, PHOTO_SPOT.z]} visible={false} />
      <mesh ref={bag} geometry={geos.bag} material={mat} position={[sm.x, groundAt(sm.x, sm.z), sm.z]} visible={false} />
      <mesh ref={seismo} geometry={geos.seismo} material={mat} position={[se.x, groundAt(se.x, se.z), se.z]} visible={false} />
      <group ref={hands} visible={false}>
        <mesh ref={handL} geometry={geos.arm} material={mat} scale={[-1, 1, 1]} frustumCulled={false} />
        <mesh ref={handR} geometry={geos.arm} material={mat} frustumCulled={false} />
      </group>
      <group ref={held} visible={false}>
        {/* Small, low and to the right, as if held in a gloved hand: about 15 percent of the screen height. */}
        <mesh ref={heldFlag} geometry={geos.flagKit} material={mat} rotation={[0.9, 0, 0.3]} scale={0.1} />
        <mesh ref={heldScoop} geometry={geos.scoop} material={mat} rotation={[0.5, 0.3, 0]} scale={0.3} />
        <mesh ref={heldSeismo} geometry={geos.seismo} material={mat} scale={0.13} position={[0, -0.05, 0]} rotation={[0.3, 0.4, 0]} />
        <mesh geometry={geos.glove} material={mat} position={[0.0, -0.075, 0.02]} />
      </group>
    </>
  )
}

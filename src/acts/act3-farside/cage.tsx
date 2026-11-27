// The cage at the far end, the two crewmen strapped inside it, and the crewman on Buzz's shoulders.
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Group, InstancedMesh, Matrix4, Mesh, SphereGeometry, type BufferGeometry } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { buildFigure } from '../../procgen/figure'
import { cbox, mergeColored } from '../../procgen/coloredGeo'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { cageDoorDistance, cageGlow } from './goals'
import { CAGE, CAGE_HANDLE, CAGED, HEIGHT } from './layout'
import { act3State, type Crew } from './state'
import { buildBlood, buildCage, buildCageDoor } from './tunnel'

const PRIORITY = 706
const DOOR_OPEN = -1.7
const DOOR_SPEED = 2.4

/** A few slow drips from the heads of the hanging crew to the floor below. */
const DRIPS = [
  { x: CAGED.cdr.x - 0.05, z: CAGED.cdr.z + 0.05, y0: 0.42, period: 4.6, phase: 0 },
  { x: CAGED.cdr.x + 0.12, z: CAGED.cdr.z - 0.08, y0: 0.3, period: 6.1, phase: 2.2 },
  { x: CAGED.cmp.x + 0.04, z: CAGED.cmp.z + 0.04, y0: 0.42, period: 5.3, phase: 1.1 },
  { x: CAGED.cmp.x - 0.1, z: CAGED.cmp.z - 0.06, y0: 0.28, period: 7.2, phase: 3.9 },
]
/** The hooks sit just under the ceiling; the feet hang from them. */
const HANG_Y = HEIGHT - 0.12

/** Bars and door. The door swings open about its hinge when the cage opens. */
export function Cage() {
  const geo = useMemo(() => ({ fixed: buildCage(), door: buildCageDoor(), blood: buildBlood() }), [])
  const mat = useMemo(() => {
    const m = createMaterial({ vertexColors: true })
    m.side = DoubleSide
    return m
  }, [])
  const bloodMat = useMemo(() => {
    const m = createMaterial({ kind: 'unlit', vertexColors: true, snap: false })
    m.side = DoubleSide
    return m
  }, [])
  const dripMat = useMemo(() => createMaterial({ kind: 'unlit', color: '#4a0808', snap: false }), [])
  // The soft glow round the door handle when the player is within 3 m.
  const glowMat = useMemo(() => {
    const m = createMaterial({ kind: 'unlit', color: '#ffd98a', snap: false, fog: false })
    m.transparent = true
    m.opacity = 0
    m.depthWrite = false
    return m
  }, [])
  const glow = useRef<Mesh>(null)
  const drips = useRef<InstancedMesh>(null)
  const door = useRef<Group>(null)
  const root = useRef<Group>(null)
  useEffect(() => {
    const mesh = drips.current
    const m = new Matrix4()
    const off = new Matrix4()
    return registerSystem('act3-drips', PRIORITY + 3, (_dt, t) => {
      if (!mesh) return
      DRIPS.forEach((d, i) => {
        // A drop gathers at the head, lets go, and falls to the floor, once every few seconds.
        const u = ((t + d.phase) % d.period) / d.period
        const gather = u < 0.55
        const fall = gather ? 0 : (u - 0.55) / 0.45
        const y = gather ? d.y0 : d.y0 * (1 - fall * fall)
        const s = gather ? 0.4 + (u / 0.55) * 0.6 : 1
        const gone = !gather && fall >= 1
        m.makeTranslation(d.x, y, d.z)
        m.multiply(off.makeScale(gone ? 0 : s, gone ? 0 : s * (gather ? 1 : 2.2), gone ? 0 : s))
        mesh.setMatrixAt(i, m)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  }, [])
  useEffect(
    () =>
      registerSystem('act3-cage', PRIORITY, (dt, t) => {
        const body = getPlayerBody()
        const g = cageGlow(body ? cageDoorDistance(body.pos.x, body.pos.z) : Infinity, act3State.cageOpen, t)
        if (glow.current) {
          glow.current.visible = g > 0
          glowMat.opacity = g * 0.75
          glow.current.scale.setScalar(1 + 0.25 * g)
        }
        const d = door.current
        if (root.current) root.current.visible = act3State.world === 'dream'
        if (!d) return
        const want = act3State.cageOpen ? DOOR_OPEN : 0
        const diff = want - d.rotation.y
        d.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), DOOR_SPEED * dt)
      }),
    [glowMat],
  )
  useEffect(
    () => () => {
      geo.fixed.dispose()
      geo.door.dispose()
      geo.blood.dispose()
      disposeMaterial(mat)
      disposeMaterial(bloodMat)
      disposeMaterial(dripMat)
      disposeMaterial(glowMat)
    },
    [geo, mat, bloodMat, dripMat, glowMat],
  )
  return (
    <group ref={root}>
      <mesh geometry={geo.fixed} material={mat} />
      <mesh geometry={geo.blood} material={bloodMat} />
      <instancedMesh ref={drips} args={[undefined, undefined, DRIPS.length]} material={dripMat} frustumCulled={false}>
        <boxGeometry args={[0.025, 0.04, 0.025]} />
      </instancedMesh>
      <group ref={door} position={[-CAGE.doorHalf, 0, CAGE.z]}>
        <mesh geometry={geo.door} material={mat} />
        <mesh ref={glow} position={[CAGE_HANDLE.x, CAGE_HANDLE.y, CAGE_HANDLE.z]} material={glowMat} visible={false} renderOrder={5}>
          <boxGeometry args={[0.2, 0.34, 0.16]} />
        </mesh>
      </group>
    </group>
  )
}

/** Neil and Mike hang upside down by the ankles from the cage room ceiling, turning slowly. Visors up, no faces. */
export function CagedCrew() {
  const figures = useMemo(() => {
    const make = (who: Crew) => {
      const f = buildFigure({ name: who === 'cdr' ? 'cdr' : 'cmp', helmet: true, visorUp: true })
      f.root.position.set(CAGED[who].x, HANG_Y, CAGED[who].z)
      return f
    }
    return { cdr: make('cdr'), cmp: make('cmp') }
  }, [])
  useEffect(
    () =>
      registerSystem('act3-caged', PRIORITY + 1, (_dt, t) => {
        const dream = act3State.world === 'dream'
        ;(['cdr', 'cmp'] as const).forEach((who, i) => {
          const f = figures[who]
          const gone = act3State.carried === who || act3State.laid[who]
          f.root.visible = dream && !gone
          if (!f.root.visible) return
          f.setPose('hanging', t * 0.8 + i * 2.1)
          f.root.position.set(CAGED[who].x, HANG_Y, CAGED[who].z)
          // A slow turn about the vertical axis, opposite ways for the two of them.
          f.root.rotation.y = (i === 0 ? 1 : -1) * (t * 0.22 + i)
        })
      }),
    [figures],
  )
  useEffect(
    () => () => {
      figures.cdr.dispose()
      figures.cmp.dispose()
    },
    [figures],
  )
  return (
    <>
      <primitive object={figures.cdr.root} />
      <primitive object={figures.cmp.root} />
    </>
  )
}

const SUIT = '#d8d0bc'
const GLOVE = '#b9b19c'
const BOOT = '#6d6a62'

/** A crewman across Buzz's shoulders: helmet near the left edge, a gloved arm and a boot at the edges. */
export function CarriedView() {
  const parts = useMemo(() => {
    const helmet = new SphereGeometry(0.1, 8, 6)
    const rest: BufferGeometry[] = [
      cbox(0.08, 0.34, 0.08, SUIT, 0.36, -0.36, -0.5),
      cbox(0.09, 0.1, 0.09, GLOVE, 0.36, -0.2, -0.5),
      cbox(0.11, 0.2, 0.28, BOOT, -0.1, -0.34, -0.52),
      cbox(0.3, 0.1, 0.12, SUIT, -0.3, -0.34, -0.5),
    ]
    return { helmet, rest: mergeColored(rest) }
  }, [])
  const mats = useMemo(() => {
    const solid = createMaterial({ kind: 'unlit', vertexColors: true, fog: false, snap: false })
    const helmet = createMaterial({ kind: 'unlit', color: SUIT, fog: false, snap: false })
    for (const m of [solid, helmet]) {
      m.depthTest = false
      m.depthWrite = false
    }
    return { solid, helmet }
  }, [])
  const group = useRef<Group>(null)
  const helmetMesh = useRef<Mesh>(null)
  useEffect(() => {
    let phase = 0
    return registerSystem('act3-carried', PRIORITY + 2, (dt) => {
      const g = group.current
      const body = getPlayerBody()
      if (!g) return
      const show = !!body && act3State.carried !== null && act3State.world === 'dream' && body.mode !== 'seated'
      g.visible = show
      if (!show || !body) return
      const eye = eyePosition(body)
      g.position.set(eye.x, eye.y, eye.z)
      g.rotation.set(body.pitch, body.yaw, 0, 'YXZ')
      const speed = Math.hypot(body.vel.x, body.vel.z)
      phase += dt * (2 + speed * 3)
      const sway = Math.sin(phase) * Math.min(1, speed)
      g.children.forEach((c) => {
        c.position.y = sway * 0.015
        c.rotation.z = sway * 0.03
      })
      if (helmetMesh.current) helmetMesh.current.position.set(-0.4, -0.22, -0.5)
    })
  }, [])
  useEffect(
    () => () => {
      parts.helmet.dispose()
      parts.rest.dispose()
      disposeMaterial(mats.solid)
      disposeMaterial(mats.helmet)
    },
    [parts, mats],
  )
  return (
    <group ref={group} visible={false} renderOrder={999}>
      <mesh ref={helmetMesh} geometry={parts.helmet} material={mats.helmet} renderOrder={999} frustumCulled={false} />
      <mesh geometry={parts.rest} material={mats.solid} renderOrder={999} frustumCulled={false} />
    </group>
  )
}

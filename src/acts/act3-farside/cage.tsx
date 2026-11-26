// The cage at the far end, the two crewmen strapped inside it, and the crewman on Buzz's shoulders.
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Group, Mesh, SphereGeometry, type BufferGeometry } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { buildFigure } from '../../procgen/figure'
import { cbox, mergeColored } from '../../procgen/coloredGeo'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { CAGE, CAGED } from './layout'
import { act3State, type Crew } from './state'
import { buildCage, buildCageDoor } from './tunnel'

const PRIORITY = 706
const DOOR_OPEN = -1.7
const DOOR_SPEED = 2.4

/** Bars and door. The door swings open about its hinge when the cage opens. */
export function Cage() {
  const geo = useMemo(() => ({ fixed: buildCage(), door: buildCageDoor() }), [])
  const mat = useMemo(() => {
    const m = createMaterial({ vertexColors: true })
    m.side = DoubleSide
    return m
  }, [])
  const door = useRef<Group>(null)
  const root = useRef<Group>(null)
  useEffect(
    () =>
      registerSystem('act3-cage', PRIORITY, (dt) => {
        const d = door.current
        if (root.current) root.current.visible = act3State.world === 'dream'
        if (!d) return
        const want = act3State.cageOpen ? DOOR_OPEN : 0
        const diff = want - d.rotation.y
        d.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), DOOR_SPEED * dt)
      }),
    [],
  )
  useEffect(
    () => () => {
      geo.fixed.dispose()
      geo.door.dispose()
      disposeMaterial(mat)
    },
    [geo, mat],
  )
  return (
    <group ref={root}>
      <mesh geometry={geo.fixed} material={mat} />
      <group ref={door} position={[-CAGE.doorHalf, 0, CAGE.z]}>
        <mesh geometry={geo.door} material={mat} />
      </group>
    </group>
  )
}

/** Neil and Mike in the cage: strapped to the wall, or the second one seated alone. */
export function CagedCrew() {
  const figures = useMemo(() => {
    const make = (who: Crew) => {
      const f = buildFigure({ name: who === 'cdr' ? 'cdr' : 'cmp', helmet: true })
      f.root.position.set(CAGED[who].x, 0, CAGED[who].z)
      f.root.rotation.y = 0
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
          f.root.position.set(CAGED[who].x, 0, CAGED[who].z)
          f.setPose('standing', t * 0.25 + i)
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

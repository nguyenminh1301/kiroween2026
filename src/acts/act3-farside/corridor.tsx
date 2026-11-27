// The corridor: shell, ribs, pipes, lockers, floor strips and the doorway to the cabin.
import { useEffect, useMemo, useRef } from 'react'
import { Color, DoubleSide, Matrix4, type Group, type InstancedMesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { getPlayerBody } from '../../engine/playerRuntime'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { Z_FAR_END } from './layout'
import { act3State } from './state'
import { buildBays, buildDoorLeaves, buildDoorway, buildHatch, buildHatchLight, buildLockers, buildPipes, buildRibs, buildShell, buildWindow, buildWindowGlow, stripSpots } from './tunnel'
import { CELL } from './mapgrid'

const STRIP_PRIORITY = 700
const DARK = new Color('#3a0a05')
const BRIGHT = new Color('#ff6a2a')
const WAVE_SPEED = 14
const WAVE_PERIOD = 60

/** Strip brightness 0 to 1 at `z`, given the time. Dark while sneaking, a wave toward the hatch in the chase. */
function stripLevel(z: number, t: number, chase: boolean, hidden: boolean): number {
  // Inside a locker the strips glow brighter: they are what lights the corridor seen through the slats.
  if (!chase) return hidden ? 0.75 : 0.3
  const wave = Z_FAR_END + ((t * WAVE_SPEED) % WAVE_PERIOD)
  const d = (z - wave) / 3
  return 0.3 + 0.7 * Math.exp(-d * d)
}

export function Corridor() {
  const root = useRef<Group>(null)
  const geo = useMemo(
    () => ({
      shell: buildShell(),
      ribs: buildRibs(),
      pipes: buildPipes(),
      lockers: buildLockers(),
      doorway: buildDoorway(),
      hatch: buildHatch(),
      leaves: buildDoorLeaves(),
      bays: buildBays(),
      hatchLight: buildHatchLight(),
      window: buildWindow(),
      windowGlow: buildWindowGlow(),
    }),
    [],
  )
  const spots = useMemo(() => stripSpots(), [])
  const mats = useMemo(() => {
    const shell = createMaterial({ textureName: 'rust', textureSeed: 31, vertexColors: true })
    shell.side = DoubleSide
    const solid = createMaterial({ vertexColors: true })
    solid.side = DoubleSide
    const strip = createMaterial({ kind: 'unlit', color: '#ffffff', snap: false })
    const glow = createMaterial({ kind: 'unlit', vertexColors: true, snap: false, fog: false })
    glow.side = DoubleSide
    return { shell, solid, strip, glow }
  }, [])
  const strips = useRef<InstancedMesh>(null)

  useEffect(() => {
    const mesh = strips.current
    if (!mesh) return
    const m = new Matrix4()
    const turn = new Matrix4()
    spots.forEach((s, i) => {
      m.makeTranslation(s.x, 0.03, s.z)
      if (!s.alongZ) m.multiply(turn.makeRotationY(Math.PI / 2))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    const c = new Color()
    const remove = registerSystem('act3-strips', STRIP_PRIORITY, (_dt, t) => {
      const hidden = getPlayerBody()?.mode === 'seated'
      // After waking only the real cabin shows.
      if (root.current) root.current.visible = act3State.world === 'dream'
      spots.forEach((s, i) => {
        const k = stripLevel(s.z, t, act3State.chase, hidden)
        c.copy(DARK).lerp(BRIGHT, k).multiplyScalar(0.25 + 0.75 * k)
        mesh.setColorAt(i, c)
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
    return remove
  }, [spots])

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
    },
    [geo],
  )
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => disposeMaterial(m))
    },
    [mats],
  )

  return (
    <group ref={root}>
      <mesh geometry={geo.shell} material={mats.shell} />
      <mesh geometry={geo.ribs} material={mats.solid} />
      <mesh geometry={geo.pipes} material={mats.solid} />
      <mesh geometry={geo.lockers} material={mats.solid} />
      <mesh geometry={geo.doorway} material={mats.solid} />
      <mesh geometry={geo.hatch} material={mats.solid} />
      <mesh geometry={geo.leaves} material={mats.solid} />
      <mesh geometry={geo.bays} material={mats.solid} />
      <mesh geometry={geo.hatchLight} material={mats.glow} />
      <mesh geometry={geo.window} material={mats.solid} />
      <mesh geometry={geo.windowGlow} material={mats.glow} />
      <instancedMesh ref={strips} args={[undefined, undefined, spots.length]} material={mats.strip} frustumCulled={false}>
        <boxGeometry args={[0.1, 0.03, CELL - 0.3]} />
      </instancedMesh>
    </group>
  )
}

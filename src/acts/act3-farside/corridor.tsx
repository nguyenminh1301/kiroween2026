// The corridor: shell, ribs, pipes, lockers, floor strips and the doorway to the cabin.
import { useEffect, useMemo, useRef } from 'react'
import { Color, DoubleSide, Matrix4, type Group, type InstancedMesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { getPlayerBody } from '../../engine/playerRuntime'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { rails, STRIP_X, Z_FAR_END, Z_HATCH_END } from './layout'
import { act3State } from './state'
import { buildDoorway, buildLockers, buildPipes, buildRibs, buildShell, SEG, SEG_COUNT } from './tunnel'

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
  const geo = useMemo(() => {
    const railSpecs = rails()
    return {
      shell: buildShell(),
      ribs: buildRibs(),
      pipes: buildPipes(railSpecs),
      lockers: buildLockers(),
      doorway: buildDoorway(),
    }
  }, [])
  const mats = useMemo(() => {
    const shell = createMaterial({ textureName: 'rust', textureSeed: 31, vertexColors: true })
    shell.side = DoubleSide
    const solid = createMaterial({ vertexColors: true })
    solid.side = DoubleSide
    const strip = createMaterial({ kind: 'unlit', color: '#ffffff', snap: false })
    return { shell, solid, strip }
  }, [])
  const strips = useRef<InstancedMesh>(null)

  useEffect(() => {
    const mesh = strips.current
    if (!mesh) return
    const m = new Matrix4()
    const zs: number[] = []
    for (let i = 0; i < SEG_COUNT; i++) zs.push(Z_HATCH_END - SEG * (i + 0.5))
    zs.forEach((z, i) => {
      for (const [k, x] of [-STRIP_X + 0.3, STRIP_X - 0.3].entries()) {
        m.makeTranslation(x, 0.03, z)
        mesh.setMatrixAt(i * 2 + k, m)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
    const c = new Color()
    const remove = registerSystem('act3-strips', STRIP_PRIORITY, (_dt, t) => {
      const hidden = getPlayerBody()?.mode === 'seated'
      // After waking only the real cabin shows.
      if (root.current) root.current.visible = act3State.world === 'dream'
      zs.forEach((z, i) => {
        const k = stripLevel(z, t, act3State.chase, hidden)
        c.copy(DARK).lerp(BRIGHT, k).multiplyScalar(0.25 + 0.75 * k)
        mesh.setColorAt(i * 2, c)
        mesh.setColorAt(i * 2 + 1, c)
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
    return remove
  }, [])

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
      <instancedMesh ref={strips} args={[undefined, undefined, SEG_COUNT * 2]} material={mats.strip} frustumCulled={false}>
        <boxGeometry args={[0.1, 0.03, SEG - 0.3]} />
      </instancedMesh>
    </group>
  )
}

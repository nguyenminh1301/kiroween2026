// The corridor: shell, ribs, pipes, lockers, floor strips, the hatch and the two crew figures.
import { useEffect, useMemo, useRef } from 'react'
import { Color, DoubleSide, Matrix4, type InstancedMesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { buildFigure } from '../../procgen/figure'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { CDR_POS, MIKE_POS, rails, STRIP_X, Z_FAR_END, Z_HATCH_END } from './layout'
import { act3State } from './state'
import { buildHatch, buildLockers, buildPipes, buildRibs, buildShell, SEG, SEG_COUNT } from './tunnel'

const STRIP_PRIORITY = 700
const DARK = new Color('#3a0a05')
const BRIGHT = new Color('#ff6a2a')
const WAVE_SPEED = 14
const WAVE_PERIOD = 60

/** Strip brightness 0 to 1 at `z`, given the time. Dark while sneaking, a wave toward the hatch in the chase. */
function stripLevel(z: number, t: number, chase: boolean): number {
  if (!chase) return 0.3
  const wave = Z_FAR_END + ((t * WAVE_SPEED) % WAVE_PERIOD)
  const d = (z - wave) / 3
  return 0.3 + 0.7 * Math.exp(-d * d)
}

export function Corridor() {
  const geo = useMemo(() => {
    const railSpecs = rails()
    return {
      shell: buildShell(),
      ribs: buildRibs(),
      pipes: buildPipes(railSpecs),
      lockers: buildLockers(),
      hatch: buildHatch(),
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

  const figures = useMemo(() => {
    const cdr = buildFigure({ name: 'cdr', helmet: true })
    cdr.root.position.set(CDR_POS.x, CDR_POS.y, CDR_POS.z)
    cdr.root.rotation.y = Math.PI
    const mike = buildFigure({ name: 'cmp', helmet: true })
    mike.root.position.set(MIKE_POS.x, MIKE_POS.y + 0.25, MIKE_POS.z)
    mike.root.rotation.y = 0
    return { cdr, mike }
  }, [])

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
      zs.forEach((z, i) => {
        const k = stripLevel(z, t, act3State.chase)
        c.copy(DARK).lerp(BRIGHT, k).multiplyScalar(0.25 + 0.75 * k)
        mesh.setColorAt(i * 2, c)
        mesh.setColorAt(i * 2 + 1, c)
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      figures.cdr.setPose('standing', t * 0.3)
      figures.cdr.root.position.y = CDR_POS.y + Math.sin(t * 0.7) * 0.04
      figures.mike.setPose('seated', t * 0.2)
    })
    return remove
  }, [figures])

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      figures.cdr.dispose()
      figures.mike.dispose()
    },
    [geo, figures],
  )
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => disposeMaterial(m))
    },
    [mats],
  )

  return (
    <>
      <mesh geometry={geo.shell} material={mats.shell} />
      <mesh geometry={geo.ribs} material={mats.solid} />
      <mesh geometry={geo.pipes} material={mats.solid} />
      <mesh geometry={geo.lockers} material={mats.solid} />
      <mesh geometry={geo.hatch} material={mats.solid} />
      <instancedMesh ref={strips} args={[undefined, undefined, SEG_COUNT * 2]} material={mats.strip} frustumCulled={false}>
        <boxGeometry args={[0.1, 0.03, SEG - 0.3]} />
      </instancedMesh>
      <primitive object={figures.cdr.root} />
      <primitive object={figures.mike.root} />
    </>
  )
}

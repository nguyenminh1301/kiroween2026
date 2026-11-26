// The command module room behind the corridor: three sleeping bags. In the dream the bags are empty and
// unzipped, and a crewman Buzz carries back lies in his bag. After waking, the real cabin shows both
// crewmen asleep, turned toward Buzz. Acts cannot share props, so this is act 3's own copy.
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, type BufferGeometry, type Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { buildFigure } from '../../procgen/figure'
import { cbox, ccyl, mergeColored } from '../../procgen/coloredGeo'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { BAGS, BUNK_LIGHT, CABIN, Z_HATCH_END } from './layout'
import { act3State } from './state'

const PRIORITY = 705

/** The room: floor, ceiling, walls with panels, a lamp. The doorway wall belongs to the corridor. */
function roomGeo(): BufferGeometry {
  const { z0, z1, halfW: C, h } = CABIN
  const zc = (z0 + z1) / 2
  const d = z1 - z0
  const parts: BufferGeometry[] = [
    cbox(2 * C, 0.1, d, '#8f8a78', 0, -0.05, zc),
    cbox(2 * C, 0.1, d, '#b4af9c', 0, h + 0.05, zc),
    cbox(0.1, h, d, '#a29d8a', -C - 0.05, h / 2, zc),
    cbox(0.1, h, d, '#a29d8a', C + 0.05, h / 2, zc),
    cbox(2 * C, h, 0.1, '#a29d8a', 0, h / 2, z1 + 0.05),
    // Instrument panel on the back wall, a stripe and two lockers.
    cbox(1.6, 0.9, 0.06, '#2c2a26', 0, 1.3, z1 - 0.03),
    cbox(1.6, 0.06, 0.07, '#e2782f', 0, 0.78, z1 - 0.03),
    cbox(0.5, 0.5, 0.06, '#6d6a5a', 1.05, 1.1, z1 - 0.03),
    cbox(0.5, 0.5, 0.06, '#6d6a5a', -1.05, 1.1, z1 - 0.03),
    // Lamp.
    cbox(0.5, 0.06, 0.2, '#e9d9a8', BUNK_LIGHT.x, BUNK_LIGHT.y + 0.05, BUNK_LIGHT.z),
  ]
  return mergeColored(parts)
}

/** The front of the command module: the wall where the corridor doorway is in the dream, closed and full of panels. */
function frontGeo(): BufferGeometry {
  const { halfW: C, h } = CABIN
  const z = Z_HATCH_END + 0.04
  const zf = z + 0.05
  const parts: BufferGeometry[] = [
    cbox(2 * C, h, 0.08, '#a29d8a', 0, h / 2, z),
    // The main instrument panel, a stripe and two side panels.
    cbox(1.9, 0.95, 0.06, '#2c2a26', 0, 1.35, zf),
    cbox(1.9, 0.06, 0.07, '#e2782f', 0, 0.82, zf),
    cbox(0.5, 0.6, 0.06, '#6d6a5a', 1.12, 1.2, zf),
    cbox(0.5, 0.6, 0.06, '#6d6a5a', -1.12, 1.2, zf),
    // The computer unit with its green display.
    cbox(0.34, 0.42, 0.07, '#4a4a42', 0.55, 1.45, zf + 0.01),
    cbox(0.26, 0.1, 0.075, '#4fae6a', 0.55, 1.58, zf + 0.012),
    // A row of dials and two rows of switches.
    ...[-0.7, -0.45, -0.2].map((x) => ccyl(0.07, 0.06, '#1c1c1c', x, 1.62, zf + 0.03, 'z', 10)),
    ...[-0.7, -0.45, -0.2].map((x) => ccyl(0.04, 0.065, '#cfc8b6', x, 1.62, zf + 0.035, 'z', 8)),
  ]
  for (let i = 0; i < 9; i++) {
    parts.push(cbox(0.04, 0.09, 0.05, i % 3 === 0 ? '#e2782f' : '#cfc8b6', -0.8 + i * 0.2, 1.15, zf + 0.04))
    parts.push(cbox(0.04, 0.09, 0.05, i % 4 === 0 ? '#e9b740' : '#cfc8b6', -0.8 + i * 0.2, 1.3, zf + 0.04))
  }
  return mergeColored(parts)
}

/** An empty, unzipped bag standing against the wall. */
function emptyBag(x: number, z: number): BufferGeometry {
  const s = Math.sign(x)
  const wall = x + s * 0.09
  return mergeColored([
    cbox(0.12, 1.5, 0.62, '#8c8a78', wall, 0.9, z),
    cbox(0.02, 1.35, 0.4, '#3a362c', wall - s * 0.07, 0.9, z),
    cbox(0.14, 0.16, 0.34, '#d9d2bf', wall - s * 0.06, 1.5, z),
    cbox(0.14, 0.06, 0.66, '#6d6a5a', wall, 0.5, z),
    cbox(0.14, 0.06, 0.66, '#6d6a5a', wall, 1.1, z),
    cbox(0.05, 1.3, 0.1, '#b9b5a2', wall - s * 0.06, 0.9, z + 0.27),
    cbox(0.05, 1.3, 0.1, '#b9b5a2', wall - s * 0.06, 0.9, z - 0.27),
  ])
}

/** A bag zipped to the chest, with a sleeper in it. */
function fullBag(x: number, z: number): BufferGeometry {
  return mergeColored([
    ccyl(0.25, 1.2, '#8c8a78', x, 0.75, z, 'y', 10),
    ccyl(0.27, 0.06, '#6d6a5a', x, 0.35, z, 'y', 10),
    ccyl(0.27, 0.06, '#6d6a5a', x, 0.9, z, 'y', 10),
    ccyl(0.27, 0.1, '#a09d89', x, 1.33, z, 'y', 10),
  ])
}

type BagId = 'cdr' | 'cmp' | 'buzz'
const BAG_IDS: BagId[] = ['cdr', 'cmp', 'buzz']

export function Cabin() {
  const room = useMemo(roomGeo, [])
  const front = useMemo(frontGeo, [])
  const frontMesh = useRef<Mesh>(null)
  const bags = useMemo(
    () =>
      BAG_IDS.map((id) => ({ id, empty: emptyBag(BAGS[id].x, BAGS[id].z), full: fullBag(BAGS[id].x, BAGS[id].z) })),
    [],
  )
  const meshes = useRef<Array<{ empty: Mesh | null; full: Mesh | null }>>(BAG_IDS.map(() => ({ empty: null, full: null })))
  const mat = useMemo(() => {
    const m = createMaterial({ kind: 'unlit', vertexColors: true })
    m.side = DoubleSide
    return m
  }, [])
  const figures = useMemo(() => {
    const make = (id: 'cdr' | 'cmp') => {
      const f = buildFigure({ name: `${id}-bag`, helmet: false })
      f.root.position.set(BAGS[id].x, 0.2, BAGS[id].z)
      // Turned toward Buzz's bag.
      f.root.rotation.y = Math.atan2(BAGS.buzz.x - BAGS[id].x, BAGS.buzz.z - BAGS[id].z)
      return f
    }
    return { cdr: make('cdr'), cmp: make('cmp') }
  }, [])

  useEffect(
    () =>
      registerSystem('act3-cabin', PRIORITY, (_dt, t) => {
        const real = act3State.world === 'real'
        if (frontMesh.current) frontMesh.current.visible = real
        const filled = { cdr: real || act3State.laid.cdr, cmp: real || act3State.laid.cmp, buzz: real }
        BAG_IDS.forEach((id, i) => {
          const m = meshes.current[i]
          if (m.empty) m.empty.visible = !filled[id]
          if (m.full) m.full.visible = filled[id]
        })
        figures.cdr.root.visible = filled.cdr
        figures.cmp.root.visible = filled.cmp
        if (filled.cdr) figures.cdr.setPose('sleeping', t * 0.3)
        if (filled.cmp) figures.cmp.setPose('sleeping', t * 0.3 + 2)
      }),
    [figures],
  )

  useEffect(
    () => () => {
      room.dispose()
      front.dispose()
      bags.forEach((b) => {
        b.empty.dispose()
        b.full.dispose()
      })
      figures.cdr.dispose()
      figures.cmp.dispose()
    },
    [room, front, bags, figures],
  )
  useEffect(() => () => disposeMaterial(mat), [mat])

  return (
    <>
      <mesh geometry={room} material={mat} />
      <mesh ref={frontMesh} geometry={front} material={mat} visible={false} />
      {bags.map((b, i) => (
        <group key={b.id}>
          <mesh geometry={b.empty} material={mat} ref={(m) => void (meshes.current[i].empty = m)} />
          <mesh geometry={b.full} material={mat} visible={false} ref={(m) => void (meshes.current[i].full = m)} />
        </group>
      ))}
      <primitive object={figures.cdr.root} />
      <primitive object={figures.cmp.root} />
    </>
  )
}

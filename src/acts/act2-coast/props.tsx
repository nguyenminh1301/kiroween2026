// Things in the rooms: breaker panels, windows, instrument panel, sleepers, bags and rails.
import { useEffect, useMemo } from 'react'
import { PlaneGeometry, Shape, ShapeGeometry, type BufferGeometry, type Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { buildFigure } from '../../procgen/figure'
import { spinAngle } from '../../procgen/cabin/spin'
import { driftOffset, driftSpin } from '../../procgen/cabin/drift'
import { buildProp, type PropKind } from '../../procgen/cabin/props'
import { createRng } from '../../procgen/rng'
import { tiledBoxAt } from '../../procgen/tiledBox'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { cbox, ccyl, mergeColored } from './geo'
import { RepairProps } from './repairProps'
import { cdrPos, inTunnel, LANDER_Z0, mikePos, rails, RAIL_Y, sleepEye } from './layout'

const PROP_PRIORITY = 700

const KNOB = '#15171a'
const YELLOW = '#e9b740'
const BLACK = '#17150f'

function breakerBank(): BufferGeometry {
  const parts: BufferGeometry[] = []
  // Base slab on the left wall, face at x = -1.1.
  parts.push(cbox(0.3, 1.7, 3.2, '#262a2a', -1.25, 1.45, -4.8))
  const rows = [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0]
  const cols = Array.from({ length: 13 }, (_, i) => -6.25 + i * 0.25)
  const groups = [
    [0, 3],
    [4, 7],
    [8, 12],
  ]
  const rowPairs = [[0, 1], [2, 3], [4, 5], [6, 6]]
  groups.forEach(([c0, c1], gi) =>
    rowPairs.forEach(([r0, r1], ri) => {
      const z0 = cols[c0] - 0.12
      const z1 = cols[c1] + 0.12
      const y0 = rows[r0] - 0.1
      const y1 = rows[r1] + 0.1
      parts.push(cbox(0.02, y1 - y0 - 0.02, z1 - z0 - 0.02, (gi + ri) % 2 ? '#3a4040' : '#343a3a', -1.1, (y0 + y1) / 2, (z0 + z1) / 2))
    }),
  )
  const rng = createRng(77)
  for (const y of rows) {
    for (const z of cols) {
      parts.push(ccyl(0.02, 0.05, rng() > 0.8 ? '#bdb7a6' : KNOB, -1.08, y, z, 'x', 6))
    }
  }
  // The yellow and black striped bar across the panels.
  for (let i = 0; i < 24; i++) {
    parts.push(cbox(0.04, 0.045, 0.125, i % 2 ? BLACK : YELLOW, -1.07, 1.7, -6.3 + i * 0.125 + 0.0625))
  }
  return mergeColored(parts)
}

function starsGeo(seed: number): BufferGeometry {
  const rng = createRng(seed)
  const parts: BufferGeometry[] = []
  for (let i = 0; i < 14; i++) {
    const g = new PlaneGeometry(0.012, 0.012)
    g.translate((rng() - 0.5) * 0.3, (rng() - 0.5) * 0.4, 0.004)
    parts.push(g)
  }
  return mergeColored(parts)
}

function triangle(scale: number): BufferGeometry {
  const s = new Shape()
  s.moveTo(-0.22 * scale, 0.28 * scale)
  s.lineTo(0.22 * scale, 0.28 * scale)
  s.lineTo(0, -0.28 * scale)
  s.closePath()
  return new ShapeGeometry(s)
}

function sleeperBag(x: number, z: number, wallSign: number): BufferGeometry {
  const parts: BufferGeometry[] = [
    // Zipped up to the chest.
    ccyl(0.25, 1.2, '#8c8a78', x, 0.75, z, 'y', 10),
    ccyl(0.27, 0.06, '#6d6a5a', x, 0.35, z, 'y', 10),
    ccyl(0.27, 0.06, '#6d6a5a', x, 0.9, z, 'y', 10),
    ccyl(0.27, 0.1, '#a09d89', x, 1.33, z, 'y', 10),
    cbox(0.03, 1.0, 0.04, '#b9b5a2', x - wallSign * 0.26, 0.85, z),
  ]
  return mergeColored(parts)
}

/** The player's empty, unzipped bag. */
function emptyBag(z: number): BufferGeometry {
  const parts: BufferGeometry[] = [
    cbox(0.12, 1.5, 0.62, '#8c8a78', -1.34, 0.9, z),
    cbox(0.02, 1.35, 0.4, '#3a362c', -1.27, 0.9, z),
    cbox(0.14, 0.16, 0.34, '#d9d2bf', -1.26, 1.5, z),
    cbox(0.14, 0.06, 0.66, '#6d6a5a', -1.34, 0.5, z),
    cbox(0.14, 0.06, 0.66, '#6d6a5a', -1.34, 1.1, z),
    cbox(0.05, 1.3, 0.1, '#b9b5a2', -1.26, 0.9, z + 0.27),
    cbox(0.05, 1.3, 0.1, '#b9b5a2', -1.26, 0.9, z - 0.27),
  ]
  return mergeColored(parts)
}

function railGeo(cmFar: number): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const r of rails(cmFar)) {
    const x = r.a.x
    const zc = (r.a.z + r.b.z) / 2
    const len = r.b.z - r.a.z
    const wall = Math.sign(x) * (inTunnel(zc, cmFar) ? 0.45 : 1.4)
    parts.push(ccyl(0.022, len, '#8d9296', x, RAIL_Y, zc, 'z', 6))
    for (let k = -1; k <= 1; k += 2) {
      const pz = zc + (k * len) / 2 * 0.9
      parts.push(cbox(Math.abs(wall - x), 0.04, 0.04, '#6c7074', (wall + x) / 2, RAIL_Y, pz))
    }
    // Striped grip in the middle.
    for (let i = 0; i < 4; i++) {
      parts.push(ccyl(0.032, 0.1, i % 2 ? BLACK : YELLOW, x, RAIL_Y, zc - 0.15 + i * 0.1, 'z', 6))
    }
  }
  return mergeColored(parts)
}

/** Tethered items drifting in the command module: a card, a pencil, a pouch and a camera. */
const DRIFTERS: { kind: PropKind; x: number; y: number; zOff: number }[] = [
  { kind: 'card', x: -1.0, y: 1.5, zOff: 0.6 },
  { kind: 'pencil', x: 1.0, y: 1.9, zOff: 1.1 },
  { kind: 'pouch', x: -0.9, y: 2.0, zOff: 2.0 },
  { kind: 'camera', x: 0.95, y: 1.3, zOff: 2.9 },
]

function Drifters({ cmFar }: { cmFar: number }) {
  const mat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const items = useMemo(
    () =>
      DRIFTERS.map((d, i) => ({
        ...d,
        i,
        geo: buildProp(d.kind),
        tether: cbox(0.008, 0.008, 1, '#cfc8b6', 0, 0, 0.5),
      })),
    [],
  )
  const refs = useMemo(() => items.map(() => ({ item: null as Mesh | null, tether: null as Mesh | null })), [items])
  useEffect(() => {
    return registerSystem('act2-drift', PROP_PRIORITY + 1, (_dt, t) => {
      items.forEach((d, i) => {
        const o = driftOffset(i + 1, t, 0.3)
        const sp = driftSpin(i + 1, t)
        const anchor = { x: Math.sign(d.x) * 1.35, y: d.y, z: cmFar + d.zOff }
        const m = refs[i].item
        const tt = refs[i].tether
        if (!m || !tt) return
        m.position.set(d.x + o.x, d.y + o.y, cmFar + d.zOff + o.z)
        m.rotation.set(sp.x, sp.y, sp.z)
        tt.position.set(anchor.x, anchor.y, anchor.z)
        tt.lookAt(m.position)
        tt.scale.set(1, 1, Math.hypot(m.position.x - anchor.x, m.position.y - anchor.y, m.position.z - anchor.z))
      })
    })
  }, [items, refs, cmFar])
  useEffect(
    () => () => {
      items.forEach((d) => {
        d.geo.dispose()
        d.tether.dispose()
      })
      disposeMaterial(mat)
    },
    [items, mat],
  )
  return (
    <>
      {items.map((d, i) => (
        <group key={d.i}>
          <mesh ref={(m) => void (refs[i].item = m)} geometry={d.geo} material={mat} />
          <mesh ref={(m) => void (refs[i].tether = m)} geometry={d.tether} material={mat} />
        </group>
      ))}
    </>
  )
}

export function Props({ cmFar }: { cmFar: number }) {
  const bank = useMemo(breakerBank, [])
  const stars = useMemo(() => [starsGeo(5), starsGeo(6)], [])
  const tri = useMemo(() => triangle(1), [])
  const triFrame = useMemo(() => triangle(1.28), [])
  const panel = useMemo(
    () => tiledBoxAt({ min: { x: 1.12, y: 0.75, z: -6.3 }, max: { x: 1.4, y: 1.95, z: -4.3 } }, 1.2),
    [],
  )
  const bags = useMemo(() => {
    const c = cdrPos(cmFar)
    const m = mikePos(cmFar)
    return mergeColored([sleeperBag(c.x, c.z, -1), sleeperBag(m.x, m.z, 1)])
  }, [cmFar])
  const mine = useMemo(() => emptyBag(sleepEye(cmFar).z), [cmFar])
  const railMesh = useMemo(() => railGeo(cmFar), [cmFar])

  const mats = useMemo(
    () => ({
      vc: createMaterial({ vertexColors: true }),
      glass: createMaterial({ kind: 'unlit', color: '#05060a', snap: false }),
      star: createMaterial({ kind: 'unlit', color: '#ffffff', snap: false }),
      frame: createMaterial({ color: '#8d9296' }),
      instrument: createMaterial({ textureName: 'instrumentPanel', textureSeed: 4 }),
    }),
    [],
  )

  // Sleepers: bobbing slowly in their bags.
  const figures = useMemo(() => {
    const c = cdrPos(cmFar)
    const m = mikePos(cmFar)
    const cdr = buildFigure({ name: 'cdr', helmet: false })
    cdr.root.position.set(c.x, c.y, c.z)
    cdr.root.rotation.y = Math.PI / 2
    const cmp = buildFigure({ name: 'cmp', helmet: false })
    cmp.root.position.set(m.x, m.y, m.z)
    cmp.root.rotation.y = -Math.PI / 2
    return { cdr, cmp, cy: c.y, my: m.y }
  }, [cmFar])

  const starRefs = useMemo(() => [null, null] as (Mesh | null)[], [])
  useEffect(() => {
    return registerSystem('act2-props', PROP_PRIORITY, (_dt, t) => {
      // The spacecraft turns once in 120 s: the stars slide across the lander windows.
      const slide = Math.sin(spinAngle(t)) * 0.09
      starRefs.forEach((m) => m?.position.set(slide, Math.cos(spinAngle(t)) * 0.04, 0.012))
      figures.cdr.setPose('sleeping', t * 0.3)
      figures.cmp.setPose('sleeping', t * 0.3 + 2)
      figures.cdr.root.position.y = figures.cy + Math.sin(t * 0.7) * 0.04
      figures.cmp.root.position.y = figures.my + Math.sin(t * 0.7 + 2) * 0.04
    })
  }, [figures, starRefs])

  useEffect(
    () => () => {
      figures.cdr.dispose()
      figures.cmp.dispose()
    },
    [figures],
  )
  useEffect(
    () => () => {
      ;[bank, ...stars, tri, triFrame, panel, bags, mine, railMesh].forEach((g) => g.dispose())
    },
    [bank, stars, tri, triFrame, panel, bags, mine, railMesh],
  )
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => disposeMaterial(m))
    },
    [mats],
  )

  const winZ = LANDER_Z0 + 0.03
  return (
    <>
      <mesh geometry={bank} material={mats.vc} />
      <mesh geometry={panel} material={mats.instrument} />
      <mesh geometry={bags} material={mats.vc} />
      <mesh geometry={mine} material={mats.vc} />
      <mesh geometry={railMesh} material={mats.vc} />
      <RepairProps cmFar={cmFar} />
      <Drifters cmFar={cmFar} />
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * 0.62, 1.6, winZ]} rotation={[0, -s * 0.4, 0]}>
          <mesh geometry={triFrame} material={mats.frame} position={[0, 0, 0.0]} />
          <mesh geometry={tri} material={mats.glass} position={[0, 0, 0.01]} />
          <mesh ref={(m) => void (starRefs[i] = m)} geometry={stars[i]} material={mats.star} position={[0, 0, 0.012]} />
        </group>
      ))}
      <primitive object={figures.cdr.root} />
      <primitive object={figures.cmp.root} />
    </>
  )
}

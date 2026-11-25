// Things in the rooms: breaker panels, windows, instrument panel, sleepers, bags, rails and the pen.
import { useEffect, useMemo, useRef } from 'react'
import { Euler, Group, PlaneGeometry, Quaternion, Shape, ShapeGeometry, Vector3, type BufferGeometry } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { buildFigure } from '../../procgen/figure'
import { createRng } from '../../procgen/rng'
import { tiledBoxAt } from '../../procgen/tiledBox'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { cbox, ccyl, mergeColored } from './geo'
import {
  BREAKER_POS,
  cdrPos,
  inTunnel,
  LANDER_Z0,
  mikePos,
  PEN_POS,
  rails,
  RAIL_Y,
  sleepEye,
} from './layout'
import { act2State } from './state'

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
      if (Math.abs(y - BREAKER_POS.y) < 0.01 && Math.abs(z - BREAKER_POS.z) < 0.01) {
        // The snapped one: a short stub.
        parts.push(ccyl(0.02, 0.02, '#6a6558', -1.09, y, z, 'x', 6))
        continue
      }
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
    cbox(0.5, 1.0, 0.5, '#8c8a78', x, 0.65, z),
    cbox(0.52, 0.06, 0.52, '#6d6a5a', x, 0.35, z),
    cbox(0.52, 0.06, 0.52, '#6d6a5a', x, 0.8, z),
    cbox(0.03, 0.8, 0.04, '#b9b5a2', x - wallSign * 0.26, 0.7, z),
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

function penGeo(): BufferGeometry {
  return mergeColored([
    ccyl(0.011, 0.13, '#1f2a45', 0, 0, 0, 'y', 6),
    ccyl(0.0125, 0.04, '#b3262a', 0, 0.085, 0, 'y', 6),
    ccyl(0.004, 0.02, '#d8d3c3', 0, -0.075, 0, 'y', 4),
  ])
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
  const pen = useMemo(penGeo, [])

  const mats = useMemo(
    () => ({
      vc: createMaterial({ vertexColors: true }),
      glass: createMaterial({ kind: 'unlit', color: '#05060a', snap: false }),
      star: createMaterial({ kind: 'unlit', color: '#ffffff', snap: false }),
      frame: createMaterial({ color: '#8d9296' }),
      instrument: createMaterial({ textureName: 'instrumentPanel', textureSeed: 4 }),
      lamp: createMaterial({ kind: 'unlit', color: '#58d36a', snap: false }),
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

  const penRef = useRef<Group>(null)
  const lampRef = useRef<Group>(null)

  useEffect(() => {
    const e = new Euler()
    const q = new Quaternion()
    const tilt = new Quaternion().setFromEuler(new Euler(-Math.PI / 2 + 0.5, 0, 0.2))
    const v = new Vector3()
    return registerSystem('act2-props', PROP_PRIORITY, (_dt, t) => {
      figures.cdr.setPose('standing', t * 0.3)
      figures.cmp.setPose('standing', t * 0.3 + 2)
      figures.cdr.root.position.y = figures.cy + Math.sin(t * 0.7) * 0.04
      figures.cmp.root.position.y = figures.my + Math.sin(t * 0.7 + 2) * 0.04
      const pg = penRef.current
      if (pg) {
        pg.visible = !act2State.breakerFixed
        const body = getPlayerBody()
        if (act2State.penHeld && body) {
          const eye = eyePosition(body)
          e.set(body.pitch, body.yaw, 0, 'YXZ')
          q.setFromEuler(e)
          v.set(0.14, -0.12, -0.34).applyQuaternion(q)
          pg.position.set(eye.x + v.x, eye.y + v.y, eye.z + v.z)
          pg.quaternion.copy(q).multiply(tilt)
        } else {
          pg.position.set(PEN_POS.x, PEN_POS.y + Math.sin(t * 1.3) * 0.04, PEN_POS.z)
          pg.rotation.set(t * 0.8, t * 0.5, t * 0.3)
        }
      }
      if (lampRef.current) lampRef.current.visible = act2State.breakerFixed
    })
  }, [figures])

  useEffect(
    () => () => {
      figures.cdr.dispose()
      figures.cmp.dispose()
    },
    [figures],
  )
  useEffect(
    () => () => {
      ;[bank, ...stars, tri, triFrame, panel, bags, mine, railMesh, pen].forEach((g) => g.dispose())
    },
    [bank, stars, tri, triFrame, panel, bags, mine, railMesh, pen],
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
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * 0.62, 1.6, winZ]} rotation={[0, -s * 0.4, 0]}>
          <mesh geometry={triFrame} material={mats.frame} position={[0, 0, 0.0]} />
          <mesh geometry={tri} material={mats.glass} position={[0, 0, 0.01]} />
          <mesh geometry={stars[i]} material={mats.star} position={[0, 0, 0.012]} />
        </group>
      ))}
      <group ref={lampRef} position={[BREAKER_POS.x - 0.03, BREAKER_POS.y + 0.1, BREAKER_POS.z]} visible={false}>
        <mesh material={mats.lamp}>
          <boxGeometry args={[0.02, 0.04, 0.04]} />
        </mesh>
      </group>
      <group ref={penRef}>
        <mesh geometry={pen} material={mats.vc} />
      </group>
      <primitive object={figures.cdr.root} />
      <primitive object={figures.cmp.root} />
    </>
  )
}

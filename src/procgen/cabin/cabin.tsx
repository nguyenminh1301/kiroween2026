import { useEffect, useMemo, useRef } from 'react'
import { CircleGeometry, Color, DoubleSide, Euler, Group, MeshBasicMaterial, PlaneGeometry, type Mesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { createRng } from '../../procgen/rng'
import { buildFigure } from '../../procgen/figure'
import { buildCouches, buildShell, WALL_SLOPE, wallRadius } from './cabinGeo'
import { COUCH_X, SHELL_SIDES } from './layout'
import { cabinState } from './cabinState'

const WINDOW_PRIORITY = 650

interface WindowSpec {
  key: 'hatch' | 'right' | 'left'
  position: [number, number, number]
  rotation: Euler
  w: number
  h: number
  round: boolean
}

function windowSpecs(): WindowSpec[] {
  const y = 1.2
  const apothem = wallRadius(y) * Math.cos(Math.PI / SHELL_SIDES) - 0.04
  return [
    { key: 'hatch', position: [0, 2.57, 0], rotation: new Euler(Math.PI / 2, 0, 0), w: 0.84, h: 0.84, round: true },
    { key: 'right', position: [apothem, y, 0], rotation: new Euler(-WALL_SLOPE, -Math.PI / 2, 0, 'YXZ'), w: 0.8, h: 0.6, round: false },
    { key: 'left', position: [-apothem, y, 0], rotation: new Euler(-WALL_SLOPE, Math.PI / 2, 0, 'YXZ'), w: 0.8, h: 0.6, round: false },
  ]
}

/** Tiny star quads spread over a window. */
function starGeometry(w: number, h: number, seed: number) {
  const rng = createRng(seed)
  const parts = []
  for (let i = 0; i < 22; i++) {
    const g = new PlaneGeometry(0.014, 0.014)
    g.translate((rng() - 0.5) * w * 0.9, (rng() - 0.5) * h * 0.9, 0.012)
    parts.push(g)
  }
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return merged
}

/** Windows: sky-colored quads, stars once the sky is dark, and the Earth disc when the act shows it. */
function Windows() {
  const specs = useMemo(windowSpecs, [])
  const skyMat = useMemo(() => new MeshBasicMaterial({ color: new Color(cabinState.sky), side: DoubleSide }), [])
  const frameMat = useMemo(() => createMaterial({ color: '#2c2820' }), [])
  const starMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, fog: false }), [])
  const earthMat = useMemo(
    () => createMaterial({ kind: 'unlit', textureName: 'earthCloud', textureSeed: 3, snap: false, fog: false }),
    [],
  )
  const quads = useMemo(() => specs.map((s) => (s.round ? new CircleGeometry(s.w / 2, 12) : new PlaneGeometry(s.w, s.h))), [specs])
  const frames = useMemo(() => specs.map((s) => (s.round ? new CircleGeometry(s.w / 2 + 0.08, 12) : new PlaneGeometry(s.w + 0.14, s.h + 0.14))), [specs])
  const stars = useMemo(() => specs.map((s, i) => starGeometry(s.w, s.h, 40 + i)), [specs])
  const earthRefs = useRef<(Mesh | null)[]>([])
  const eased = useRef(new Color(cabinState.sky))
  const target = useMemo(() => new Color(), [])

  useEffect(() => {
    return registerSystem('act1-windows', WINDOW_PRIORITY, (dt) => {
      target.set(cabinState.sky)
      eased.current.lerp(target, Math.min(1, dt * 1.5))
      skyMat.color.copy(eased.current)
      const lum = eased.current.r + eased.current.g + eased.current.b
      starMat.opacity = Math.min(1, Math.max(0, (0.45 - lum) / 0.3))
      for (const m of earthRefs.current) if (m) m.visible = cabinState.earth
    })
  }, [skyMat, starMat, target])

  useEffect(
    () => () => {
      skyMat.dispose()
      starMat.dispose()
      disposeMaterial(frameMat)
      disposeMaterial(earthMat)
      ;[...quads, ...frames, ...stars].forEach((g) => g.dispose())
    },
    [skyMat, starMat, frameMat, earthMat, quads, frames, stars],
  )

  return (
    <>
      {specs.map((s, i) => (
        <group key={s.key} position={s.position} rotation={s.rotation}>
          <mesh geometry={frames[i]} material={frameMat} position={[0, 0, -0.01]} />
          <mesh geometry={quads[i]} material={skyMat} />
          <mesh geometry={stars[i]} material={starMat} />
          <mesh
            ref={(m) => {
              earthRefs.current[i] = m
            }}
            material={earthMat}
            position={[s.key === 'hatch' ? 0.08 : 0.12, s.key === 'left' ? 0.05 : -0.04, 0.025]}
            visible={false}
          >
            <circleGeometry args={[s.key === 'hatch' ? 0.2 : s.key === 'right' ? 0.28 : 0.16, 14]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/** The two crewmen in the left and center couches, in white suits with helmets. */
function Crew() {
  const group = useRef<Group>(null)
  const figures = useMemo(
    () => [
      { name: 'cdr', x: COUCH_X[0] },
      { name: 'cmp', x: COUCH_X[1] },
    ].map((c) => ({ ...c, fig: buildFigure({ name: c.name, helmet: true }) })),
    [],
  )
  useEffect(() => {
    figures.forEach(({ fig, x }) => {
      fig.setPose('seated', 0)
      fig.root.position.set(x, 0, 0.62)
      fig.root.rotation.y = Math.PI
      group.current?.add(fig.root)
    })
    return () => figures.forEach(({ fig }) => fig.dispose())
  }, [figures])
  return <group ref={group} />
}

export function Cabin() {
  const shell = useMemo(buildShell, [])
  const couches = useMemo(buildCouches, [])
  const wallMat = useMemo(() => {
    const m = createMaterial({ textureName: 'cabinPanel', textureSeed: 1 })
    m.side = DoubleSide
    return m
  }, [])
  const couchMat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const floorMat = useMemo(() => createMaterial({ color: '#3a342a' }), [])
  useEffect(
    () => () => {
      shell.dispose()
      couches.dispose()
      disposeMaterial(wallMat)
      disposeMaterial(couchMat)
      disposeMaterial(floorMat)
    },
    [shell, couches, wallMat, couchMat, floorMat],
  )
  return (
    <>
      <mesh geometry={shell} material={wallMat} />
      <mesh geometry={couches} material={couchMat} />
      <mesh position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <circleGeometry args={[2.8, SHELL_SIDES]} />
      </mesh>
      <Windows />
      <Crew />
    </>
  )
}

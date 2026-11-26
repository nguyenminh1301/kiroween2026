import { useEffect, useMemo, useRef } from 'react'
import {
  CircleGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Euler,
  Group,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { paintWindowView } from '../windowView'
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

const VIEW_W = 64

/** Earth disc per window: centre as fractions of the window (y down), radius as a fraction of its width. */
const EARTH_SPEC: Record<WindowSpec['key'], { cx: number; cy: number; r: number }> = {
  hatch: { cx: 0.6, cy: 0.55, r: 0.24 },
  right: { cx: 0.65, cy: 0.57, r: 0.35 },
  left: { cx: 0.65, cy: 0.42, r: 0.2 },
}

/**
 * Windows. Each one shows its own small texture (sky, stars, Earth, plasma or sea) on the window quad,
 * so nothing can reach past the frame.
 */
function Windows() {
  const specs = useMemo(windowSpecs, [])
  const frameMat = useMemo(() => createMaterial({ color: '#2c2820' }), [])
  const views = useMemo(
    () =>
      specs.map((s, i) => {
        const w = VIEW_W
        const h = s.round ? VIEW_W : Math.round((VIEW_W * s.h) / s.w)
        const buf = new Uint8Array(w * h * 4)
        const tex = new DataTexture(buf, w, h, RGBAFormat, UnsignedByteType)
        tex.magFilter = NearestFilter
        tex.minFilter = NearestFilter
        tex.generateMipmaps = false
        tex.colorSpace = SRGBColorSpace
        const mat = new MeshBasicMaterial({ map: tex, fog: false, side: DoubleSide })
        return { buf, tex, mat, spec: { w, h, round: s.round, earth: EARTH_SPEC[s.key], seed: 40 + i } }
      }),
    [specs],
  )
  const quads = useMemo(() => specs.map((s) => (s.round ? new CircleGeometry(s.w / 2, 12) : new PlaneGeometry(s.w, s.h))), [specs])
  const frames = useMemo(() => specs.map((s) => (s.round ? new CircleGeometry(s.w / 2 + 0.08, 12) : new PlaneGeometry(s.w + 0.14, s.h + 0.14))), [specs])
  const eased = useRef(new Color(cabinState.sky))
  const target = useMemo(() => new Color(), [])

  useEffect(() => {
    let acc = 1
    let clock = 0
    return registerSystem('act1-windows', WINDOW_PRIORITY, (dt) => {
      target.set(cabinState.sky)
      eased.current.lerp(target, Math.min(1, dt * 1.5))
      clock += dt
      acc += dt
      // About 14 repaints a second is enough for stars, streaks and waves.
      if (acc < 1 / 14) return
      acc = 0
      const c = eased.current
      const st = {
        mode: cabinState.view,
        sky: [c.r * 255, c.g * 255, c.b * 255] as const,
        t: clock,
        earth: cabinState.earth,
      }
      for (const v of views) {
        paintWindowView(v.buf, v.spec, st)
        v.tex.needsUpdate = true
      }
    })
  }, [views, target])

  useEffect(
    () => () => {
      views.forEach((v) => {
        v.tex.dispose()
        v.mat.dispose()
      })
      disposeMaterial(frameMat)
      ;[...quads, ...frames].forEach((g) => g.dispose())
    },
    [views, frameMat, quads, frames],
  )

  return (
    <>
      {specs.map((s, i) => (
        <group key={s.key} position={s.position} rotation={s.rotation}>
          <mesh geometry={frames[i]} material={frameMat} position={[0, 0, -0.01]} />
          <mesh geometry={quads[i]} material={views[i].mat} />
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

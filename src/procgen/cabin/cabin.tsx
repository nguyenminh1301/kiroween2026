import { useEffect, useMemo, useRef } from 'react'
import {
  CircleGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Group,
  Matrix4,
  Quaternion,
  Vector3,
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
import { buildCouches, buildShell } from './cabinGeo'
import { COUCH_X, SHELL_SIDES } from './layout'
import { viewDirections, windowDefs } from './windows'
import { cabinState } from './cabinState'

const WINDOW_PRIORITY = 650

/** Texture width for a window: small windows get fewer texels. */
const viewWidth = (w: number): number => (w > 0.5 ? 64 : 32)

/**
 * Windows. Each one is a quad flush with the shell. Its texture is painted from one shared outside world by
 * direction (see windows.ts), so the Earth shows only where it really is, and nothing reaches past the frame.
 */
function Windows() {
  const specs = useMemo(windowDefs, [])
  const poses = useMemo(
    () =>
      specs.map((d) => {
        const m = new Matrix4().makeBasis(
          new Vector3(d.x.x, d.x.y, d.x.z),
          new Vector3(d.y.x, d.y.y, d.y.z),
          new Vector3(d.z.x, d.z.y, d.z.z),
        )
        return new Quaternion().setFromRotationMatrix(m)
      }),
    [specs],
  )
  const frameMat = useMemo(() => createMaterial({ color: '#2c2820' }), [])
  const views = useMemo(
    () =>
      specs.map((s, i) => {
        const w = viewWidth(s.w)
        const h = s.round ? w : Math.round((w * s.h) / s.w)
        const buf = new Uint8Array(w * h * 4)
        const tex = new DataTexture(buf, w, h, RGBAFormat, UnsignedByteType)
        tex.magFilter = NearestFilter
        tex.minFilter = NearestFilter
        tex.generateMipmaps = false
        tex.colorSpace = SRGBColorSpace
        const mat = new MeshBasicMaterial({ map: tex, fog: false, side: DoubleSide })
        return { buf, tex, mat, spec: { w, h, round: s.round, dirs: viewDirections(s, w, h), seed: 40 + i } }
      }),
    [specs],
  )
  const quads = useMemo(() => specs.map((s) => (s.round ? new CircleGeometry(s.w / 2, 12) : new PlaneGeometry(s.w, s.h))), [specs])
  const frames = useMemo(() => specs.map((s) => (s.round ? new CircleGeometry(s.w / 2 + 0.06, 12) : new PlaneGeometry(s.w + 0.1, s.h + 0.1))), [specs])
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
        <group key={s.key} position={[s.center.x, s.center.y, s.center.z]} quaternion={poses[i]}>
          <mesh geometry={frames[i]} material={frameMat} position={[0, 0, -0.004]} />
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

import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CircleGeometry, Matrix4, PlaneGeometry, Quaternion, Vector3, type InstancedMesh, type Material } from 'three'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { mergeStatic, tiledBoxAt, tiledCylinder } from '../../procgen/tiledBox'
import { buildSkyDome, buildSunDisc } from '../../procgen/skyDome'
import { bootprints, HATCH_POS, SUN_DIRECTION, VISUAL_BOXES, type MatName } from './room'
import { Crowd } from './crowd'
import { PadCrew } from './crew'

const FOG = { color: '#c8b49a', near: 120, far: 700 }
const GROUND_Y = -75

/** One merged geometry per material, so the walkway and the room cost a handful of draw calls. */
function buildStatics() {
  const byMat = new Map<MatName, ReturnType<typeof tiledBoxAt>[]>()
  for (const { box, mat } of VISUAL_BOXES) {
    const list = byMat.get(mat) ?? []
    list.push(tiledBoxAt(box))
    byMat.set(mat, list)
  }
  return [...byMat.entries()].map(([mat, parts]) => ({ mat, geometry: mergeStatic(parts) }))
}

/** The Saturn V beyond the White Room: spacecraft, escape tower, adapter and stages going down to the pad. */
function buildRocket() {
  const X = 0
  const Z = -12.6
  const white = [
    tiledCylinder(0.45, 1.95, 3.2, X, 0.6, Z, 3),
    tiledCylinder(1.95, 1.95, 7.5, X, -4.75, Z, 6),
    tiledCylinder(1.95, 3.3, 8.5, X, -12.75, Z, 6),
    tiledCylinder(0.45, 0.45, 3.4, X, 8.2, Z, 3),
    tiledCylinder(5, 5, 24, X, -50, Z, 6, 16),
  ]
  const steel = [tiledCylinder(0.1, 0.1, 6.8, X, 5.6, Z, 3, 6), tiledCylinder(0.02, 0.45, 2, X, 11, Z, 3, 8)]
  const roll = [
    tiledCylinder(3.3, 3.3, 18, X, -26, Z, 18, 12),
    tiledCylinder(5, 5, 38, X, -81, Z, 38, 16),
    tiledCylinder(5, 3.3, 3, X, -36.5, Z, 3, 12),
  ]
  return { white: mergeStatic(white), steel: mergeStatic(steel), roll: mergeStatic(roll) }
}

export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)

  const mats = useMemo(
    () => ({
      grating: createMaterial({ textureName: 'padGrating', textureSeed: 1 }),
      steel: createMaterial({ textureName: 'paintedSteel', textureSeed: 2 }),
      rail: createMaterial({ color: '#c9c4b4' }),
      room: createMaterial({ textureName: 'whiteRoom', textureSeed: 3 }),
      lamp: createMaterial({ kind: 'unlit', color: '#ffdfa6', snap: false }),
      rocketWhite: createMaterial({ textureName: 'whiteRoom', textureSeed: 4 }),
      rocketRoll: createMaterial({ textureName: 'rocketSkin', textureSeed: 5 }),
      spike: createMaterial({ color: '#2a2622' }),
      ground: createMaterial({ textureName: 'fieldPatch', textureSeed: 6 }),
      sea: createMaterial({ color: '#58737d' }),
      concrete: createMaterial({ color: '#9b9484' }),
      hatchRim: createMaterial({ color: '#8d8777' }),
      hatchDisc: createMaterial({ color: '#c9c2b0' }),
      hatchDark: createMaterial({ color: '#4c473d' }),
      print: createMaterial({ kind: 'unlit', color: '#0c0a08', snap: false }),
    }),
    [],
  )
  const statics = useMemo(buildStatics, [])
  const rocket = useMemo(buildRocket, [])
  const sky = useMemo(() => buildSkyDome({ top: '#3f5f82', horizon: '#f2c38d', bottom: '#3a3326' }), [])
  const sun = useMemo(() => buildSunDisc({ direction: SUN_DIRECTION, size: 3.5 }), [])
  const groundGeo = useMemo(() => {
    const g = new PlaneGeometry(2400, 2400)
    g.rotateX(-Math.PI / 2)
    g.attributes.uv.array.forEach((_, i, a) => ((a as Float32Array)[i] *= 6))
    return g
  }, [])
  const seaGeo = useMemo(() => {
    const g = new PlaneGeometry(2400, 1200)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const printGeo = useMemo(() => {
    const g = new CircleGeometry(1, 8)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const printRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = printRef.current
    if (!mesh) return
    const m = new Matrix4()
    const q = new Quaternion()
    const up = new Vector3(0, 1, 0)
    bootprints().forEach((p, i) => {
      q.setFromAxisAngle(up, p.yaw)
      m.compose(new Vector3(p.x, 0.02, p.z), q, new Vector3(0.09, 1, 0.17))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useEffect(() => {
    applyFog(scene, gl, FOG)
    return () => {
      clearFog(scene, gl)
      Object.values(mats).forEach((m: Material) => disposeMaterial(m))
      statics.forEach((s) => s.geometry.dispose())
      Object.values(rocket).forEach((g) => g.dispose())
      sky.dispose()
      sun.dispose()
      groundGeo.dispose()
      seaGeo.dispose()
      printGeo.dispose()
    }
  }, [scene, gl, mats, statics, rocket, sky, sun, groundGeo, seaGeo, printGeo])

  return (
    <>
      <PlayerCamera />
      <hemisphereLight args={['#9db7c9', '#4b4840', 1.0]} />
      <directionalLight color="#ffd8a8" intensity={1.3} position={[-60, 20, -100]} />
      <directionalLight color="#8fa8c8" intensity={0.4} position={[60, 30, 80]} />
      <pointLight color="#ffe2b0" intensity={5} distance={16} decay={1.4} position={[0, 2.3, -5.2]} />

      <primitive object={sky.mesh} />
      <primitive object={sun.mesh} />

      {statics.map((s) => (
        <mesh key={s.mat} geometry={s.geometry} material={mats[s.mat]} />
      ))}

      <mesh geometry={rocket.white} material={mats.rocketWhite} />
      <mesh geometry={rocket.steel} material={mats.spike} />
      <mesh geometry={rocket.roll} material={mats.rocketRoll} />

      <mesh geometry={groundGeo} material={mats.ground} position={[0, GROUND_Y, 0]} />
      <mesh geometry={seaGeo} material={mats.sea} position={[0, GROUND_Y + 0.2, -900]} />
      <mesh position={[0, GROUND_Y + 0.1, -12.6]} material={mats.concrete}>
        <cylinderGeometry args={[40, 40, 0.2, 16]} />
      </mesh>

      <mesh position={[HATCH_POS.x, HATCH_POS.y, HATCH_POS.z + 0.02]} rotation={[Math.PI / 2, 0, 0]} material={mats.hatchRim}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 12]} />
      </mesh>
      <mesh position={[HATCH_POS.x, HATCH_POS.y, HATCH_POS.z + 0.08]} rotation={[Math.PI / 2, 0, 0]} material={mats.hatchDisc}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 12]} />
      </mesh>
      <mesh position={[HATCH_POS.x, HATCH_POS.y, HATCH_POS.z + 0.13]} material={mats.hatchDark}>
        <boxGeometry args={[0.3, 0.06, 0.05]} />
      </mesh>

      <instancedMesh
        ref={printRef}
        args={[printGeo, mats.print, bootprints().length]}
        frustumCulled={false}
      />

      <Crowd />
      <PadCrew />
    </>
  )
}

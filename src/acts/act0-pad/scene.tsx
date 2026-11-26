import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, CircleGeometry, Matrix4, PlaneGeometry, Quaternion, Vector3, type InstancedMesh, type Material } from 'three'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { mergeStatic, tiledBoxAt, tiledCylinder } from '../../procgen/tiledBox'
import { buildEscapeTower } from '../../procgen/escapeTower'
import { buildSideHatch } from '../../procgen/sideHatch'
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

/** Where the spacecraft barrel sits. Its front surface is the back wall of the White Room, at z = -9. */
const CM_R = 1.95
const STACK_Z = -9 - CM_R

/**
 * The Saturn V behind and below the White Room. The spacecraft barrel forms the room's back wall; the cone,
 * the escape tower, the service module, the adapter and the 10 m wide stages follow down to the ground.
 * The stages are shorter than the real ones so the wide body is in view from the arm.
 */
function buildRocket() {
  const X = 0
  const Z = STACK_Z
  const white: BufferGeometry[] = [
    tiledCylinder(CM_R, CM_R, 2.6, X, 0.4, Z, 3, 16),
    // Command module cone under the boost protective cover: 3.9 m base, 3.2 m tall.
    tiledCylinder(0.45, CM_R, 3.2, X, 3.3, Z, 3, 16),
    tiledCylinder(CM_R, CM_R, 4.5, X, -3.15, Z, 6, 16),
    tiledCylinder(CM_R, 3.3, 4, X, -7.4, Z, 6, 16),
  ]
  const tower = buildEscapeTower(X, 4.9, Z)
  white.push(tower.white)
  const steel = [tower.dark]
  const roll = [
    tiledCylinder(3.3, 3.3, 10, X, -14.4, Z, 10, 16),
    tiledCylinder(3.3, 5, 3, X, -20.9, Z, 3, 16),
    tiledCylinder(5, 5, 20, X, -32.4, Z, 20, 20),
    tiledCylinder(5, 5, 33, X, -58.9, Z, 33, 20),
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
      vc: createMaterial({ vertexColors: true }),
      print: createMaterial({ kind: 'unlit', color: '#0c0a08', snap: false }),
    }),
    [],
  )
  const statics = useMemo(buildStatics, [])
  const hatchGeo = useMemo(buildSideHatch, [])
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
      hatchGeo.dispose()
      sky.dispose()
      sun.dispose()
      groundGeo.dispose()
      seaGeo.dispose()
      printGeo.dispose()
    }
  }, [scene, gl, mats, statics, rocket, hatchGeo, sky, sun, groundGeo, seaGeo, printGeo])

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
      <mesh position={[0, GROUND_Y + 0.1, STACK_Z]} material={mats.concrete}>
        <cylinderGeometry args={[40, 40, 0.2, 16]} />
      </mesh>

      <mesh geometry={hatchGeo} material={mats.vc} position={[HATCH_POS.x, HATCH_POS.y, STACK_Z + CM_R - 0.02]} />

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

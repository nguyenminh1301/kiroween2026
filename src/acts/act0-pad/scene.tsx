import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, PlaneGeometry, type Group, type Material, type Mesh } from 'three'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { mergeStatic, tiledBoxAt, tiledCylinder } from '../../procgen/tiledBox'
import { buildEscapeTower } from '../../procgen/escapeTower'
import { buildHatchHandle, buildSideHatch } from '../../procgen/sideHatch'
import { buildSkyDome, buildSunDisc } from '../../procgen/skyDome'
import type { Box } from '../../engine/collision'
import { hatchBoxParts, hatchCouches } from './hatchBox'
import { HATCH_POS, SUN_DIRECTION, VISUAL_BOXES, type MatName } from './room'
import { act0State } from './state'
import { Crowd } from './crowd'
import { PadCrew } from './crew'

const FOG = { color: '#c8b49a', near: 120, far: 700 }
const GROUND_Y = -75

const center = (b: Box): [number, number, number] => [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2]
const size = (b: Box): [number, number, number] => [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]

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
      dark: createMaterial({ kind: 'unlit', color: '#080605', snap: false }),
      couchFaint: createMaterial({ kind: 'unlit', color: '#1b1511', snap: false }),
    }),
    [],
  )
  const statics = useMemo(buildStatics, [])
  const hatchGeo = useMemo(buildSideHatch, [])
  const handleGeo = useMemo(buildHatchHandle, [])
  const hatchRef = useRef<Group>(null)
  const handleRef = useRef<Mesh>(null)
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
  useFrame(() => {
    if (hatchRef.current) hatchRef.current.rotation.y = -act0State.hatchOpen
    if (handleRef.current) handleRef.current.rotation.z = -act0State.handle
  })

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
      handleGeo.dispose()
    }
  }, [scene, gl, mats, statics, rocket, hatchGeo, handleGeo, sky, sun, groundGeo, seaGeo])

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

      {hatchBoxParts().map((b, i) => (
        <mesh key={`hb${i}`} material={mats.dark} position={center(b)}>
          <boxGeometry args={size(b)} />
        </mesh>
      ))}
      {hatchCouches().map((b, i) => (
        <mesh key={`hc${i}`} material={mats.couchFaint} position={center(b)}>
          <boxGeometry args={size(b)} />
        </mesh>
      ))}
      <group ref={hatchRef} position={[HATCH_POS.x - 0.5, HATCH_POS.y, STACK_Z + CM_R - 0.02]}>
        <mesh geometry={hatchGeo} material={mats.vc} position={[0.5, 0, 0]} />
        <mesh ref={handleRef} geometry={handleGeo} material={mats.vc} position={[0.5, -0.12, 0.125]} />
      </group>

      <Crowd />
      <PadCrew />
    </>
  )
}

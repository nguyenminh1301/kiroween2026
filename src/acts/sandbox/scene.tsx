import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Matrix4, type InstancedMesh, type Material } from 'three'
import type { Box } from '../../engine/collision'
import { PlayerCamera } from '../../engine/PlayerCamera'
import { applyFog, clearFog } from '../../render/fog'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { snapPatch } from '../../render/snapPatch'
import {
  CEILING,
  EAST_WALL,
  NORTH_WALL,
  OBSTACLES,
  RAMP_ANGLE,
  RAMP_END_X,
  RAMP_HEIGHT,
  RAMP_START_X,
  ROOM_HALF,
  SEAT_BACK,
  SEAT_BOX,
  SOUTH_WALL,
  WEST_WALL,
  ZERO_G_ZONE,
} from './room'

const TILE_METRES = 2
const FOG = { color: '#3a3a3a', near: 6, far: 25 }

/** Box geometry whose UVs repeat the texture every TILE_METRES on each face. */
function tiledBox(w: number, h: number, d: number): BoxGeometry {
  const g = new BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  // Face order: +x, -x, +y, -y, +z, -z. Each face has 4 vertices.
  const sizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    const [su, sv] = sizes[f]
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i
      uv.setXY(k, (uv.getX(k) * su) / TILE_METRES, (uv.getY(k) * sv) / TILE_METRES)
    }
  }
  return g
}

function boxSize(box: Box): [number, number, number] {
  return [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]
}

function boxCenter(box: Box): [number, number, number] {
  const [w, h, d] = boxSize(box)
  return [box.min.x + w / 2, box.min.y + h / 2, box.min.z + d / 2]
}

function BoxMesh({ box, material }: { box: Box; material: Material }) {
  const [w, h, d] = boxSize(box)
  const geometry = useMemo(() => tiledBox(w, h, d), [w, h, d])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh position={boxCenter(box)} geometry={geometry} material={material} />
}

/** The repeated obstacle props, drawn as one instanced mesh. */
function Obstacles({ material }: { material: Material }) {
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => tiledBox(1, 1, 1), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new Matrix4()
    OBSTACLES.forEach((b, i) => {
      const [w, h, d] = boxSize(b)
      const [x, y, z] = boxCenter(b)
      m.makeScale(w, h, d).setPosition(x, y, z)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={ref} args={[geometry, material, OBSTACLES.length]} frustumCulled={false} />
}

const RAMP_RUN = RAMP_END_X - RAMP_START_X
const RAMP_LENGTH = RAMP_RUN / Math.cos(RAMP_ANGLE)
const RAMP_THICKNESS = 0.2
// The top face passes through (RAMP_START_X, 0) and (RAMP_END_X, RAMP_HEIGHT).
const RAMP_CENTER_X = RAMP_START_X + RAMP_RUN / 2 + (Math.sin(RAMP_ANGLE) * RAMP_THICKNESS) / 2
const RAMP_CENTER_Y = RAMP_HEIGHT / 2 - (Math.cos(RAMP_ANGLE) * RAMP_THICKNESS) / 2

/** PS1-look room: factory materials, procedural textures, fog. */
export function Scene() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const mats = useMemo(
    () => ({
      floor: createMaterial({ textureName: 'gratingPlate', textureSeed: 1 }),
      wall: createMaterial({ textureName: 'metalPanel', textureSeed: 2 }),
      ceiling: createMaterial({ textureName: 'whitePanel', textureSeed: 3 }),
      obstacle: createMaterial({ textureName: 'rust', textureSeed: 4 }),
      ramp: createMaterial({ textureName: 'regolith', textureSeed: 5 }),
      seat: createMaterial({ textureName: 'instrumentPanel', textureSeed: 6 }),
      zone: createMaterial({ kind: 'unlit', color: '#4a7aaa', snap: false }),
    }),
    [],
  )
  mats.zone.transparent = true
  mats.zone.opacity = 0.12
  mats.zone.depthWrite = false

  useEffect(() => {
    const list = Object.values(mats)
    list.forEach((m) => {
      if (m !== mats.zone) snapPatch.apply(m)
    })
    applyFog(scene, gl, FOG)
    return () => {
      list.forEach(disposeMaterial)
      clearFog(scene, gl)
    }
  }, [mats, scene, gl])

  const floorGeo = useMemo(() => tiledBox(ROOM_HALF * 2, 0.1, ROOM_HALF * 2), [])
  const rampGeo = useMemo(() => tiledBox(RAMP_LENGTH, RAMP_THICKNESS, ROOM_HALF * 2), [])
  const plateauGeo = useMemo(
    () => tiledBox(ROOM_HALF - RAMP_END_X, RAMP_HEIGHT, ROOM_HALF * 2),
    [],
  )
  useEffect(
    () => () => {
      floorGeo.dispose()
      rampGeo.dispose()
      plateauGeo.dispose()
    },
    [floorGeo, rampGeo, plateauGeo],
  )

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 4]} intensity={0.9} />
      <PlayerCamera />

      <mesh position={[0, -0.05, 0]} geometry={floorGeo} material={mats.floor} />
      <BoxMesh box={NORTH_WALL} material={mats.wall} />
      <BoxMesh box={SOUTH_WALL} material={mats.wall} />
      <BoxMesh box={WEST_WALL} material={mats.wall} />
      <BoxMesh box={EAST_WALL} material={mats.wall} />
      <BoxMesh box={CEILING} material={mats.ceiling} />
      <Obstacles material={mats.obstacle} />

      <mesh
        position={[RAMP_CENTER_X, RAMP_CENTER_Y, 0]}
        rotation={[0, 0, RAMP_ANGLE]}
        geometry={rampGeo}
        material={mats.ramp}
      />
      <mesh
        position={[(RAMP_END_X + ROOM_HALF) / 2, RAMP_HEIGHT / 2, 0]}
        geometry={plateauGeo}
        material={mats.ramp}
      />

      <BoxMesh box={SEAT_BOX} material={mats.seat} />
      <BoxMesh box={SEAT_BACK} material={mats.seat} />
      <BoxMesh box={ZERO_G_ZONE} material={mats.zone} />
    </>
  )
}

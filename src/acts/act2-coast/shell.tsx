// The three rooms: lander cabin, docking tunnel and command module. Rebuilt when `cmFar` changes.
import { useEffect, useMemo } from 'react'
import { DoubleSide, CylinderGeometry, Path, RingGeometry, Shape, ShapeGeometry, type BufferGeometry } from 'three'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { mergeStatic, tiledBoxAt } from '../../procgen/tiledBox'
import {
  CM_LENGTH,
  LANDER_Z0,
  LANDER_Z1,
  lightPos,
  ROOM_H,
  ROOM_HALF_W,
  TUNNEL_AXIS_Y,
  TUNNEL_HALF,
} from './layout'

const W = ROOM_HALF_W
const T = 0.1

const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  tiledBoxAt({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } })

/** A room wall at `z` with an octagonal hole for the tunnel. Faces both ways. */
function endWall(z: number): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(-W, 0)
  shape.lineTo(W, 0)
  shape.lineTo(W, ROOM_H)
  shape.lineTo(-W, ROOM_H)
  shape.lineTo(-W, 0)
  const hole = new Path()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const x = TUNNEL_HALF * Math.sin(a)
    const y = TUNNEL_AXIS_Y + TUNNEL_HALF * Math.cos(a)
    if (i === 0) hole.moveTo(x, y)
    else hole.lineTo(x, y)
  }
  hole.closePath()
  shape.holes.push(hole)
  const g = new ShapeGeometry(shape)
  g.translate(0, 0, z)
  return g
}

function roomSlabs(z0: number, z1: number): BufferGeometry[] {
  return [
    slab(-W, W, -T, 0, z0, z1),
    slab(-W, W, ROOM_H, ROOM_H + T, z0, z1),
    slab(W, W + T, 0, ROOM_H, z0, z1),
    slab(-W - T, -W, 0, ROOM_H, z0, z1),
  ]
}

export function Shell({ cmFar }: { cmFar: number }) {
  const g = useMemo(() => {
    const cmEnd = cmFar + CM_LENGTH
    const walls = mergeStatic([
      ...roomSlabs(LANDER_Z0, LANDER_Z1),
      slab(-W, W, 0, ROOM_H, LANDER_Z0 - T, LANDER_Z0),
      ...roomSlabs(cmFar, cmEnd),
      slab(-W, W, 0, ROOM_H, cmEnd, cmEnd + T),
    ])
    const ends = mergeStatic([endWall(LANDER_Z1), endWall(cmFar)])
    const len = cmFar - LANDER_Z1
    const tube = new CylinderGeometry(TUNNEL_HALF, TUNNEL_HALF, len, 8, Math.max(1, Math.round(len / 0.75)), true)
    tube.rotateX(Math.PI / 2)
    tube.translate(0, TUNNEL_AXIS_Y, LANDER_Z1 + len / 2)
    const uv = tube.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * len * 1.5)
    const ribs: BufferGeometry[] = []
    for (let z = LANDER_Z1 + 0.3; z < cmFar - 0.1; z += 0.3) {
      const r = new CylinderGeometry(TUNNEL_HALF - 0.012, TUNNEL_HALF - 0.012, 0.05, 8, 1, true)
      r.rotateX(Math.PI / 2)
      r.translate(0, TUNNEL_AXIS_Y, z)
      ribs.push(r)
    }
    const rings: BufferGeometry[] = []
    for (const [z, dir] of [[LANDER_Z1, -1], [cmFar, 1]] as const) {
      const r = new RingGeometry(TUNNEL_HALF, TUNNEL_HALF + 0.12, 8, 1)
      r.translate(0, TUNNEL_AXIS_Y, z + dir * 0.012)
      rings.push(r)
    }
    return { walls, ends, tube, ribs: mergeStatic(ribs), rings: mergeStatic(rings) }
  }, [cmFar])

  const mats = useMemo(() => {
    const white = createMaterial({ textureName: 'whitePanel', textureSeed: 11 })
    white.side = DoubleSide
    const tunnel = createMaterial({ textureName: 'whiteRoom', textureSeed: 12 })
    tunnel.side = DoubleSide
    const rib = createMaterial({ color: '#cfcbbd' })
    rib.side = DoubleSide
    const ring = createMaterial({ color: '#e2782f' })
    ring.side = DoubleSide
    const lamp = createMaterial({ kind: 'unlit', color: '#fff2d2', snap: false })
    return { white, tunnel, rib, ring, lamp }
  }, [])

  useEffect(
    () => () => {
      Object.values(g).forEach((x) => x.dispose())
    },
    [g],
  )
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => disposeMaterial(m))
    },
    [mats],
  )

  const lp = lightPos(cmFar)
  return (
    <>
      <mesh geometry={g.walls} material={mats.white} />
      <mesh geometry={g.ends} material={mats.white} />
      <mesh geometry={g.tube} material={mats.tunnel} />
      <mesh geometry={g.ribs} material={mats.rib} />
      <mesh geometry={g.rings} material={mats.ring} />
      <mesh position={[lp.x, ROOM_H - 0.02, lp.z]}>
        <boxGeometry args={[0.9, 0.04, 0.5]} />
        <primitive object={mats.lamp} attach="material" />
      </mesh>
      <pointLight color="#fff0d8" intensity={3} distance={9} decay={1.2} position={[lp.x, lp.y, lp.z]} />
    </>
  )
}

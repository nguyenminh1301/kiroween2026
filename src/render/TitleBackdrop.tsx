// A live backdrop for the title and menu screens: a short stretch of the rust corridor, one dim red
// lamp, black fog, a drifting camera, and the creature crossing the far end now and then.
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Mesh, PerspectiveCamera, PointLight } from 'three'
import { registerSystem } from '../engine/frameDriver'
import { flickerScale } from '../engine/settings'
import { gameStore } from '../engine/store'
import { buildCreature, poseCreature } from '../procgen/creatureModel'
import { cbox, mergeColored, QuadBuilder, type P3 } from '../procgen/coloredGeo'
import { applyFog, clearFog } from './fog'
import { createMaterial, disposeMaterial } from './materialFactory'
import { creatureProgress, driftPose } from './backdropMath'

const HALF_W = 1.2
const HEIGHT = 2.4
const CHAMFER = 0.5
const FLAT = HALF_W - CHAMFER
const SEG = 1.5
const SEGS = 14
const OPEN_SEG = 10
const CROSS_Z = -(OPEN_SEG + 0.5) * SEG
const PROFILE: Array<[number, number]> = [
  [-FLAT, 0], [FLAT, 0], [HALF_W, CHAMFER], [HALF_W, HEIGHT - CHAMFER],
  [FLAT, HEIGHT], [-FLAT, HEIGHT], [-HALF_W, HEIGHT - CHAMFER], [-HALF_W, CHAMFER],
]
const SHADES = ['#9a6a5a', '#b8826c', '#7a4a3c', '#c89580', '#6a3a30']
const FOG = { color: '#000000', near: 2, far: 13 }
const PRIORITY = 600

function buildBackdropGeo() {
  const q = new QuadBuilder()
  const T = 1 / 1.5
  for (let i = 0; i < SEGS; i++) {
    const za = -SEG * i
    const zb = za - SEG
    let u = 0
    for (let j = 0; j < 8; j++) {
      const [x0, y0] = PROFILE[j]
      const [x1, y1] = PROFILE[(j + 1) % 8]
      const len = Math.hypot(x1 - x0, y1 - y0)
      const side = j === 1 || j === 2 || j === 3 || j === 5 || j === 6 || j === 7
      const skip = side && i === OPEN_SEG && j !== 1 && j !== 5
      if (!skip) {
        q.quad([x0, y0, za] as P3, [x1, y1, za] as P3, [x1, y1, zb] as P3, [x0, y0, zb] as P3, u * T, i * T, (u + len) * T, (i + 1) * T, SHADES[(i * 3 + j * 5) % SHADES.length])
      }
      u += len
    }
  }
  const ring = (z: number): P3[] => PROFILE.map(([x, y]) => [x, y, z] as P3)
  q.fan([0, HEIGHT / 2, -SEG * SEGS], ring(-SEG * SEGS), '#1a0a08')
  // Ribs every 3 m.
  const ribs = []
  for (let z = -1.5; z > -SEG * SEGS; z -= 3) {
    ribs.push(cbox(2.4, 0.08, 0.12, '#4a2a22', 0, HEIGHT - 0.04, z), cbox(0.08, 2.0, 0.12, '#4a2a22', -HALF_W + 0.04, 1.2, z), cbox(0.08, 2.0, 0.12, '#4a2a22', HALF_W - 0.04, 1.2, z))
  }
  return { shell: q.build(), ribs: mergeColored(ribs) }
}

export function TitleBackdrop() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const geo = useMemo(buildBackdropGeo, [])
  const mats = useMemo(() => {
    const shell = createMaterial({ textureName: 'rust', textureSeed: 31, vertexColors: true })
    shell.side = 2
    const solid = createMaterial({ vertexColors: true })
    const dark = createMaterial({ kind: 'unlit', color: '#000000', snap: false })
    return { shell, solid, dark }
  }, [])
  const bones = useMemo(() => {
    const b = buildCreature(mats.dark)
    b.root.visible = false
    return b
  }, [mats])
  const lamp = useMemo(() => new PointLight('#ff3a1a', 60, 20, 1.2), [])

  useEffect(() => {
    applyFog(scene, gl, FOG)
    return () => clearFog(scene, gl)
  }, [scene, gl])

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const saved = { fov: cam.fov, far: cam.far }
    cam.fov = 62
    cam.far = 40
    cam.updateProjectionMatrix()
    let phase = 0
    const remove = registerSystem('title-backdrop', PRIORITY, (dt, t) => {
      const p = driftPose(t)
      cam.position.set(p.x, p.y, p.z)
      cam.rotation.set(0, p.yaw, p.roll, 'YXZ')
      lamp.position.set(0, 2.1, p.z - 6 + Math.sin(t * 0.7) * 0.2)
      lamp.intensity = 14 + (Math.sin(t * 5.1) * 1.2 + Math.sin(t * 13) * 0.6) * flickerScale(gameStore.getState().settings.reducedMotion)
      const k = creatureProgress(t)
      bones.root.visible = k !== null
      if (k === null) return
      phase += dt * 2.6
      const x = -3.4 + k * 6.8
      bones.root.position.set(x, 0, CROSS_Z)
      bones.root.rotation.y = Math.PI / 2
      poseCreature(bones, 'walk', t, phase)
    })
    return () => {
      remove()
      cam.fov = saved.fov
      cam.far = saved.far
      cam.rotation.set(0, 0, 0)
      cam.updateProjectionMatrix()
    }
  }, [camera, bones, lamp])

  useEffect(
    () => () => {
      geo.shell.dispose()
      geo.ribs.dispose()
      bones.root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
      Object.values(mats).forEach((m) => disposeMaterial(m))
    },
    [geo, bones, mats],
  )

  return (
    <>
      <ambientLight color="#3a1a14" intensity={0.8} />
      <primitive object={lamp} />
      <mesh geometry={geo.shell} material={mats.shell} />
      <mesh geometry={geo.ribs} material={mats.solid} />
      <primitive object={bones.root} />
    </>
  )
}

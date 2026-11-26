// Outside sets for the cinematic shots: the pad, the space set and the TLI view.
// Each is drawn only while `act1State.view` names it.
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  CanvasTexture,
  CylinderGeometry,
  Quaternion,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
  Vector3,
  type Group,
  type Material,
} from 'three'
import { flickerScale } from '../../engine/settings'
import { gameStore } from '../../engine/store'
import { registerSystem } from '../../engine/frameDriver'
import { createRng } from '../../procgen/rng'
import { buildSkyDome } from '../../procgen/skyDome'
import { applyFog, clearFog } from '../../render/fog'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { mergeStatic } from '../../procgen/tiledBox'
import { buildFirstStage, buildTower, buildUpperStack, type StackGeometry } from './saturn'
import { cabinState } from '../../procgen/cabin/cabinState'
import { act1State } from './state'
import {
  ENGINE_OFFSETS,
  flicker,
  PLUME_R_END,
  PLUME_R_TOP,
  plumeLength,
  trenchEmission,
  trenchFraction,
} from './plume'
import {
  IGNITION_AT,
  PAD_BASE_Y,
  PAD_X,
  rocketHeight,
  SPACE_X,
  SPACE_Y,
  STAGING_AT,
  TLI_Z,
  tliEngineLevel,
} from './timelines'

const OUTSIDE_PRIORITY = 660
export const SMOKE_MAX = 600
const SMOKE_LIFE = 7
const S_IC_TOP = 44
/** The pad rocket is drawn wider than life so it fills the shots: 16 m instead of 10 m. */
const ROCKET_WIDTH = 1.6

const PAD_FOG = { color: '#c8b49a', near: 500, far: 4500 }
const CABIN_FOG = { color: '#4a4232', near: 5, far: 16 }

function disposeStack(s: StackGeometry): void {
  s.white.dispose()
  s.roll.dispose()
  s.dark.dispose()
}

function useStackMaterials() {
  return useMemo(
    () => ({
      white: createMaterial({ textureName: 'whiteRoom', textureSeed: 4, fog: true }),
      roll: createMaterial({ textureName: 'rocketSkin', textureSeed: 5 }),
      dark: createMaterial({ color: '#2a2622' }),
    }),
    [],
  )
}

function Stack({ geo, mats }: { geo: StackGeometry; mats: ReturnType<typeof useStackMaterials> }) {
  return (
    <>
      <mesh geometry={geo.white} material={mats.white} />
      <mesh geometry={geo.roll} material={mats.roll} />
      <mesh geometry={geo.dark} material={mats.dark} />
    </>
  )
}

interface FlameProps {
  level: () => number
  radius: number
  length: number
  glow?: number
}

/** A flame cone pointing down from the group origin: orange outer, pale inner, optional additive glow. */
function Flame({ level, radius, length, glow = 0 }: FlameProps) {
  const group = useRef<Group>(null)
  const outer = useMemo(() => new ConeGeometry(radius, length, 7, 1, true).rotateX(Math.PI).translate(0, -length / 2, 0), [radius, length])
  const inner = useMemo(() => new ConeGeometry(radius * 0.55, length * 0.7, 7, 1, true).rotateX(Math.PI).translate(0, -length * 0.35, 0), [radius, length])
  const glowGeo = useMemo(() => new SphereGeometry(radius * 1.1, 10, 8), [radius])
  const outerMat = useMemo(() => new MeshBasicMaterial({ color: '#ff9a2a', side: 2, fog: false }), [])
  const innerMat = useMemo(() => new MeshBasicMaterial({ color: '#fff0b8', side: 2, fog: false }), [])
  const glowMat = useMemo(
    () => new MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, fog: false }),
    [],
  )
  useEffect(() => {
    const remove = registerSystem('act1-flame', OUTSIDE_PRIORITY, (_dt, t) => {
      const g = group.current
      if (!g) return
      const l = level()
      g.visible = l > 0.02
      const k = flickerScale(gameStore.getState().settings.reducedMotion)
      const flick = 1 + (Math.sin(t * 47) * 0.06 + Math.sin(t * 31) * 0.05) * k
      g.scale.set(1 + 0.2 * k * Math.sin(t * 40), l * flick, 1 + 0.2 * k * Math.cos(t * 37))
    })
    return () => {
      remove()
      ;[outer, inner, glowGeo].forEach((x) => x.dispose())
      ;[outerMat, innerMat, glowMat].forEach((x) => x.dispose())
    }
  }, [level, outer, inner, glowGeo, outerMat, innerMat, glowMat])
  return (
    <group ref={group} visible={false}>
      <mesh geometry={outer} material={outerMat} />
      <mesh geometry={inner} material={innerMat} />
      {/* A soft glow hugging the plume: long and thin, never a disc. */}
      {glow > 0 && <mesh geometry={glowGeo} material={glowMat} position={[0, -length * 0.3, 0]} scale={[glow * 0.55, glow * 2.4, glow * 0.55]} />}
    </group>
  )
}


/** A soft round glow, drawn once on a small canvas. */
function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,240,200,1)')
    grad.addColorStop(0.4, 'rgba(255,170,70,0.5)')
    grad.addColorStop(1, 'rgba(255,120,30,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
  }
  return new CanvasTexture(c)
}

/**
 * The liftoff flame: five engine plumes (white yellow core, orange edge) that merge into one plume about as wide
 * as the first stage, plus a glow at the bells. Additive and flickering. Long and wide plumes grow with height.
 */
function Plume() {
  const group = useRef<Group>(null)
  const parts = useMemo(() => {
    // Unit-length cones, wide end down. Scaled in y to the plume length each frame.
    const cone = (r0: number, r1: number) => new CylinderGeometry(r0, r1, 1, 9, 1, true).translate(0, -0.5, 0)
    const additive = (color: string, opacity: number) =>
      new MeshBasicMaterial({ color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: 2, fog: false })
    return {
      edge: cone(PLUME_R_TOP, PLUME_R_END),
      core: cone(PLUME_R_TOP * 0.5, PLUME_R_END * 0.45),
      merged: cone(4.4, 5.6),
      edgeMat: additive('#ff8a1e', 0.55),
      coreMat: additive('#fff3b0', 0.8),
      mergedMat: additive('#ff9a3a', 0.3),
      glowTex: glowTexture(),
    }
  }, [])
  const sprite = useMemo(() => {
    const s = new Sprite(new SpriteMaterial({ map: parts.glowTex, blending: AdditiveBlending, depthWrite: false, transparent: true, fog: false }))
    s.position.set(0, -1.5, 0)
    return s
  }, [parts])
  const meshes = useRef<Group[]>([])

  useEffect(() => {
    const remove = registerSystem('act1-plume', OUTSIDE_PRIORITY, (_dt, t) => {
      const g = group.current
      if (!g) return
      const level = cabinState.engine
      const h = rocketHeight(act1State.launchT)
      const len = plumeLength(h, level)
      g.visible = level > 0.02 && act1State.ignited
      const k = flickerScale(gameStore.getState().settings.reducedMotion)
      meshes.current.forEach((m, i) => {
        if (!m) return
        if (i < ENGINE_OFFSETS.length) m.scale.set(1, len * flicker(t, i, k), 1)
        else m.scale.set(1, len * 0.8 * flicker(t, i, k), 1)
      })
      // More of the flame goes sideways into the trench near the pad: the glow is brighter and wider there.
      const trench = trenchFraction(h)
      sprite.scale.setScalar((16 + 10 * trench) * (1 + 0.05 * k * Math.sin(t * 40)))
      sprite.material.opacity = Math.min(1, level) * (0.6 + 0.3 * trench)
    })
    return () => {
      remove()
      ;[parts.edge, parts.core, parts.merged, parts.edgeMat, parts.coreMat, parts.mergedMat, parts.glowTex].forEach((x) => x.dispose())
      sprite.material.dispose()
    }
  }, [parts, sprite])

  const slot = (i: number) => (el: Group | null) => {
    if (el) meshes.current[i] = el
  }
  return (
    <group ref={group} visible={false}>
      {ENGINE_OFFSETS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <group ref={slot(i)}>
            <mesh geometry={parts.edge} material={parts.edgeMat} />
            <mesh geometry={parts.core} material={parts.coreMat} />
          </group>
        </group>
      ))}
      <group ref={slot(ENGINE_OFFSETS.length)} position={[0, -1, 0]}>
        <mesh geometry={parts.merged} material={parts.mergedMat} />
      </group>
      <primitive object={sprite} />
    </group>
  )
}

/** Up to 600 low-poly puffs of smoke and steam pouring out along both sides of the trench and rising. */
function Smoke() {
  const geo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const mat = useMemo(() => new MeshLambertMaterial({ color: '#ffffff', emissive: '#7a766c', fog: false }), [])
  const mesh = useRef<InstancedMesh>(null)
  const seeds = useMemo(() => {
    const rng = createRng(77)
    return Array.from({ length: SMOKE_MAX }, () => [rng(), rng(), rng()] as const)
  }, [])
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const c = new Color()
    for (let i = 0; i < SMOKE_MAX; i++) m.setColorAt(i, c.set(i % 3 === 0 ? '#9a958a' : i % 3 === 1 ? '#d8d4c8' : '#f4f2ea'))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    const mx = new Matrix4()
    const q = new Quaternion()
    const p = new Vector3()
    const s = new Vector3()
    const remove = registerSystem('act1-smoke', OUTSIDE_PRIORITY, () => {
      if (act1State.view !== 'pad') return
      const T = act1State.launchT - IGNITION_AT
      for (let i = 0; i < SMOKE_MAX; i++) {
        const age = T - (i * SMOKE_LIFE) / SMOKE_MAX
        if (!act1State.ignited || age < 0) {
          s.set(0, 0, 0)
          mx.compose(p.set(0, -50, 0), q, s)
          m.setMatrixAt(i, mx)
          continue
        }
        const a = age % SMOKE_LIFE
        // A puff is born from the trench: it is as big as the trench was pouring when it left.
        const born = trenchEmission(act1State.launchT - a)
        if (born < 0.03) {
          s.set(0, 0, 0)
          mx.compose(p.set(0, -50, 0), q, s)
          m.setMatrixAt(i, mx)
          continue
        }
        const [r1, r2, r3] = seeds[i]
        const side = i % 2 ? 1 : -1
        const fade = a > SMOKE_LIFE - 1.5 ? (SMOKE_LIFE - a) / 1.5 : 1
        // Puffs roll out along the trench, then lift and thin out.
        const roll = 1 - Math.exp(-a * 0.9)
        p.set(side * (5 + roll * (22 + r1 * 40)), 2 + roll * (3 + r2 * 4) + a * (0.6 + r2 * 1.4), (r3 - 0.5) * (12 + a * 4))
        s.setScalar((1.2 + a * 0.55 + r2 * 1.2) * fade * (0.35 + 0.65 * born))
        mx.compose(p, q, s)
        m.setMatrixAt(i, mx)
      }
      m.instanceMatrix.needsUpdate = true
    })
    return remove
  }, [seeds])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  return <instancedMesh ref={mesh} args={[geo, mat, SMOKE_MAX]} frustumCulled={false} />
}

function PadSet() {
  const root = useRef<Group>(null)
  const rocket = useRef<Group>(null)
  const mats = useStackMaterials()
  const lower = useMemo(buildFirstStage, [])
  const upper = useMemo(() => buildUpperStack({ tower: true }), [])
  const tower = useMemo(buildTower, [])
  const sky = useMemo(() => buildSkyDome({ top: '#5f86ad', horizon: '#f2c38d', bottom: '#8e7c60' }, 5000), [])
  const mat = useMemo(
    () => ({
      tower: createMaterial({ color: '#8e3b22' }),
      pad: createMaterial({ color: '#8a8780' }),
      trench: createMaterial({ color: '#2b2824' }),
      ground: createMaterial({ color: '#c4b48c' }),
      sea: createMaterial({ color: '#5d7d8a' }),
      fence: createMaterial({ color: '#8a8b86' }),
      leg: createMaterial({ color: '#6c6a62' }),
    }),
    [],
  )
  const geo = useMemo(
    () => ({
      slab: new BoxGeometry(110, 3, 110).translate(0, -1.5, 0),
      trench: new BoxGeometry(150, 0.2, 14).translate(0, 0.05, 0),
      trenchWalls: mergeStatic([
        new BoxGeometry(150, 5, 3).translate(0, 2.5, 8.5),
        new BoxGeometry(150, 5, 3).translate(0, 2.5, -8.5),
        // Flame deflector under the engines.
        new BoxGeometry(16, 3, 14).rotateZ(0.5).translate(0, 1, 0),
      ]),
      // A chain-link fence line far behind the rocket: posts and two rails.
      fence: (() => {
        const g: BufferGeometry[] = [
          new BoxGeometry(900, 0.25, 0.25).translate(0, 2.2, -230),
          new BoxGeometry(900, 0.25, 0.25).translate(0, 0.8, -230),
        ]
        for (let x = -450; x <= 450; x += 15) g.push(new BoxGeometry(0.4, 3.2, 0.4).translate(x, 1.6, -230))
        return mergeStatic(g)
      })(),
      // Flat sandy ground that ends at the shore, with the sea beyond.
      ground: new PlaneGeometry(9000, 6300).rotateX(-Math.PI / 2).translate(0, -3.2, 1350),
      sea: new PlaneGeometry(9000, 3200).rotateX(-Math.PI / 2).translate(0, -3.3, -3400),
      legs: (() => {
        const g = [
          new BoxGeometry(4, PAD_BASE_Y, 4).translate(9, PAD_BASE_Y / 2, 9),
          new BoxGeometry(4, PAD_BASE_Y, 4).translate(-9, PAD_BASE_Y / 2, 9),
          new BoxGeometry(4, PAD_BASE_Y, 4).translate(9, PAD_BASE_Y / 2, -9),
          new BoxGeometry(4, PAD_BASE_Y, 4).translate(-9, PAD_BASE_Y / 2, -9),
          new BoxGeometry(22, 2, 22).translate(0, PAD_BASE_Y - 1, 0),
        ]
        return mergeStatic(g)
      })(),
    }),
    [],
  )

  useEffect(() => {
    const remove = registerSystem('act1-pad', OUTSIDE_PRIORITY, () => {
      if (root.current) root.current.visible = act1State.view === 'pad'
      if (rocket.current) rocket.current.position.y = PAD_BASE_Y + rocketHeight(act1State.launchT)
    })
    return () => {
      remove()
      disposeStack(lower)
      disposeStack(upper)
      tower.dispose()
      sky.dispose()
      Object.values(geo).forEach((g) => g.dispose())
      Object.values(mat).forEach((m: Material) => disposeMaterial(m))
      Object.values(mats).forEach((m: Material) => disposeMaterial(m))
    }
  }, [lower, upper, tower, sky, geo, mat, mats])

  return (
    <group ref={root} position={[PAD_X, 0, 0]} visible={false}>
      <primitive object={sky.mesh} />
      <mesh geometry={geo.ground} material={mat.ground} />
      <mesh geometry={geo.slab} material={mat.pad} />
      <mesh geometry={geo.trench} material={mat.trench} />
      <mesh geometry={geo.trenchWalls} material={mat.pad} />
      <mesh geometry={geo.sea} material={mat.sea} />
      <mesh geometry={geo.fence} material={mat.fence} />
      <mesh geometry={geo.legs} material={mat.leg} />
      <mesh geometry={tower} material={mat.tower} position={[-40, 0, 0]} />
      <group ref={rocket} position={[0, PAD_BASE_Y, 0]} scale={[ROCKET_WIDTH, 1, ROCKET_WIDTH]}>
        <Stack geo={lower} mats={mats} />
        <group position={[0, S_IC_TOP, 0]}>
          <Stack geo={upper} mats={mats} />
        </group>
        <group position={[0, -4, 0]}>
          <Plume />
        </group>
      </group>
      <group position={[0, 2, 0]}>
        <Smoke />
      </group>
    </group>
  )
}

function starPoints(count: number, radius: number, seed: number): BufferGeometry {
  const rng = createRng(seed)
  const arr: number[] = []
  while (arr.length < count * 3) {
    const y = rng() * 2 - 0.4
    const th = rng() * Math.PI * 2
    const r = Math.sqrt(Math.max(0, 1 - Math.min(1, y * y)))
    arr.push(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(arr, 3))
  return g
}

function SpaceSet() {
  const root = useRef<Group>(null)
  const firstStage = useRef<Group>(null)
  const mats = useStackMaterials()
  const lower = useMemo(buildFirstStage, [])
  const upper = useMemo(() => buildUpperStack({ tower: false }), [])
  const third = useMemo(() => buildUpperStack({ fromThird: true, tower: false }), [])
  const earth = useMemo(() => {
    const g = new SphereGeometry(3000, 28, 18)
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2)
    return g
  }, [])
  const limb = useMemo(() => new SphereGeometry(3045, 28, 18), [])
  const stars = useMemo(() => starPoints(500, 7000, 5), [])
  const earthMat = useMemo(() => createMaterial({ textureName: 'earthCloud', textureSeed: 3, fog: false, snap: false }), [])
  const limbMat = useMemo(() => new MeshBasicMaterial({ color: '#5a9ee8', side: BackSide, fog: false }), [])
  const starMat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', fog: false }), [])
  const stageLevel = useMemo(() => () => (act1State.launchT > STAGING_AT ? Math.min(1, (act1State.launchT - STAGING_AT) * 1.5) * 0.9 : 0), [])
  const tliLevel = useMemo(() => () => (act1State.view === 'tli' || act1State.tliT > 0 ? tliEngineLevel(act1State.tliT) : 0), [])
  const tliRoot = useRef<Group>(null)
  const stackRoot = useRef<Group>(null)

  useEffect(() => {
    const remove = registerSystem('act1-space', OUTSIDE_PRIORITY, () => {
      const v = act1State.view
      if (root.current) root.current.visible = v === 'space' || v === 'tli'
      if (stackRoot.current) stackRoot.current.visible = v === 'space'
      if (tliRoot.current) tliRoot.current.visible = v === 'tli'
      const f = firstStage.current
      if (f) {
        const s = Math.max(0, act1State.launchT - STAGING_AT)
        const stuck = act1State.launchT <= STAGING_AT
        f.position.set(stuck ? 0 : s * 1.2, stuck ? -S_IC_TOP : -S_IC_TOP - 2.2 * s * s - s * 3, stuck ? 0 : s * 0.8)
        f.rotation.set(stuck ? 0 : s * 0.5, 0, stuck ? 0 : s * 0.35)
      }
    })
    return () => {
      remove()
      disposeStack(lower)
      disposeStack(upper)
      disposeStack(third)
      ;[earth, limb, stars].forEach((g) => g.dispose())
      disposeMaterial(earthMat)
      limbMat.dispose()
      starMat.dispose()
      Object.values(mats).forEach((m: Material) => disposeMaterial(m))
    }
  }, [lower, upper, third, earth, limb, stars, earthMat, limbMat, starMat, mats])

  return (
    <group ref={root} position={[SPACE_X, 0, 0]} visible={false}>
      <mesh geometry={earth} material={earthMat} position={[0, -3000, 0]} />
      <mesh geometry={limb} material={limbMat} position={[0, -3000, 0]} />
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial color="#ffffff" size={1} sizeAttenuation={false} fog={false} />
      </points>
      <group ref={stackRoot} position={[0, SPACE_Y, 0]}>
        <Stack geo={upper} mats={mats} />
        <group position={[0, -3, 0]}>
          <Flame level={stageLevel} radius={5} length={36} />
        </group>
        <group ref={firstStage} position={[0, -S_IC_TOP, 0]}>
          <Stack geo={lower} mats={mats} />
        </group>
      </group>
      <group ref={tliRoot} position={[0, SPACE_Y, TLI_Z]}>
        <Stack geo={third} mats={mats} />
        <group position={[0, -3, 0]}>
          <Flame level={tliLevel} radius={3} length={40} glow={3} />
        </group>
      </group>
    </group>
  )
}

/** The three outside sets, plus the fog and clear color that go with the current view. */
export function Outside() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    let last = ''
    const remove = registerSystem('act1-view', OUTSIDE_PRIORITY - 1, () => {
      const v = act1State.view
      if (v === last) return
      last = v
      if (v === 'pad') applyFog(scene, gl, PAD_FOG)
      else if (v === 'cabin') applyFog(scene, gl, CABIN_FOG)
      else clearFog(scene, gl)
    })
    return () => {
      remove()
      clearFog(scene, gl)
    }
  }, [scene, gl])
  return (
    <>
      <PadSet />
      <SpaceSet />
    </>
  )
}

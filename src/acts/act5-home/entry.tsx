// The entry set at x = -5000: the Earth below, stars, the capsule nose back, its plasma bubble and trail.
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  type Group,
  type Points,
} from 'three'
import { flickerScale } from '../../engine/settings'
import { gameStore } from '../../engine/store'
import { registerSystem } from '../../engine/frameDriver'
import { createRng } from '../../procgen/rng'
import { buildSkyDome } from '../../procgen/skyDome'
import { act5State } from './state'
import { ENTRY_X } from './timeline'
import { FLIGHT_ROLL, entryGlow, particleAt } from './entryFx'
import { ribbedPanelTexture } from './textures'

const PRIORITY = 660
const SPARKS = 160
/** Earth radius in the set, and how far under the module its surface lies. */
const EARTH_R = 300
const EARTH_DROP = 36
const SUN = { x: 0.5, y: 0, z: -0.85 } as const

function stars(count: number, radius: number, seed: number): BufferGeometry {
  const rng = createRng(seed)
  const arr: number[] = []
  while (arr.length < count * 3) {
    const y = rng() * 2 - 1
    const th = rng() * Math.PI * 2
    const r = Math.sqrt(1 - y * y)
    arr.push(Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(arr, 3))
  return g
}

/** The command module: a cone of ribbed silver panels over a brown heat shield, pointing up along +y. */
export function Capsule() {
  const geo = useMemo(
    () => ({
      cone: new CylinderGeometry(0.45, 1.95, 3.2, 12, 1),
      nose: new CylinderGeometry(0.3, 0.42, 0.45, 8, 1).translate(0, 1.8, 0),
      shield: new SphereGeometry(4.6, 12, 4, 0, Math.PI * 2, 0, 0.43).rotateX(Math.PI).translate(0, 2.58, 0),
    }),
    [],
  )
  const mat = useMemo(() => {
    const map = ribbedPanelTexture()
    map.repeat.set(2, 1)
    return {
      panel: new MeshLambertMaterial({ map, color: '#ffffff', emissive: '#4a4842' }),
      shield: new MeshLambertMaterial({ color: '#6a4426', emissive: '#3a2412' }),
      nose: new MeshLambertMaterial({ color: '#8a877d' }),
      map,
    }
  }, [])
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      mat.map.dispose()
      mat.panel.dispose()
      mat.shield.dispose()
      mat.nose.dispose()
    },
    [geo, mat],
  )
  return (
    <>
      <mesh geometry={geo.cone} material={mat.panel} />
      <mesh geometry={geo.nose} material={mat.nose} />
      <mesh geometry={geo.shield} material={mat.shield} />
    </>
  )
}

type RGB = readonly [number, number, number]
const mix = (a: RGB, b: RGB, f: number): RGB => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]

/** Soft additive glow: bright where the surface faces the camera, fading to nothing at the silhouette. */
function glowMaterial(power: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uGlow: { value: 0 }, uPow: { value: power } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vC;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        #ifdef USE_COLOR
        vC = color;
        #else
        vC = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uGlow; uniform float uPow;
      varying vec3 vN; varying vec3 vV; varying vec3 vC;
      void main() {
        float f = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPow);
        gl_FragColor = vec4(vC * f * uGlow, 1.0);
      }`,
  })
}

function paint(g: BufferGeometry, color: (i: number) => RGB): BufferGeometry {
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set(color(i), i * 3)
  g.setAttribute('color', new BufferAttribute(arr, 3))
  return g
}

const WHITE: RGB = [1, 0.96, 0.75]
const ORANGE: RGB = [1, 0.5, 0.12]
const RED: RGB = [0.75, 0.12, 0.04]
const DIM: RGB = [0.3, 0.04, 0.02]

/**
 * A thin cap of glowing air hugging the heat shield, in capsule coordinates (the shield faces -y).
 * White and yellow at the centre, orange to red at the rim.
 */
function shellCap(radius: number, angle: number, apexY: number, rimFade: number): BufferGeometry {
  const g = new SphereGeometry(radius, 24, 8, 0, Math.PI * 2, 0, angle)
  const pos = g.attributes.position
  paint(g, (i) => {
    const f = Math.acos(Math.min(1, pos.getY(i) / radius)) / angle
    const c = f < 0.45 ? mix(WHITE, ORANGE, f / 0.45) : mix(ORANGE, RED, (f - 0.45) / 0.55)
    const k = 1 - rimFade * f * f
    return [c[0] * k, c[1] * k, c[2] * k]
  })
  g.rotateX(Math.PI)
  g.translate(0, apexY + radius, 0)
  return g
}

/** An open cone that streams from x = 0 back along -x, fading from `near` to `far` colour. */
function wakeCone(r0: number, r1: number, length: number, near: RGB, far: RGB): BufferGeometry {
  const g = new CylinderGeometry(r0, r1, length, 18, 10, true)
  g.rotateZ(-Math.PI / 2)
  g.translate(-length / 2, 0, 0)
  const pos = g.attributes.position
  return paint(g, (i) => {
    const u = Math.min(1, Math.max(0, -pos.getX(i) / length))
    const c = mix(near, far, u)
    const k = (1 - u) ** 1.4
    return [c[0] * k, c[1] * k, c[2] * k]
  })
}

/** Dark blue Earth, lighter toward the dawn side. */
function earthSphere(): BufferGeometry {
  const g = new SphereGeometry(EARTH_R, 56, 28)
  const pos = g.attributes.position
  return paint(g, (i) => {
    const d = (pos.getX(i) * SUN.x + pos.getY(i) * SUN.y + pos.getZ(i) * SUN.z) / EARTH_R
    const lit = Math.max(0, d) ** 2
    const n = Math.sin(pos.getX(i) * 0.09) * Math.sin(pos.getZ(i) * 0.07) * 0.5 + 0.5
    return [0.015 + lit * 0.12, 0.05 + lit * 0.2 + n * 0.015, 0.16 + lit * 0.3 + n * 0.03]
  })
}

/** A thin atmosphere shell seen from outside: pale blue along the limb, a line of dawn toward the sun. */
function atmosphere(): BufferGeometry {
  const g = new SphereGeometry(EARTH_R + 2.5, 56, 28)
  const pos = g.attributes.position
  return paint(g, (i) => {
    const d = (pos.getX(i) * SUN.x + pos.getY(i) * SUN.y + pos.getZ(i) * SUN.z) / (EARTH_R + 2.5)
    const dawn = Math.max(0, d) ** 5
    return mix([0.1, 0.25, 0.6], [1, 0.62, 0.3], dawn)
  })
}

export function EntrySet() {
  const root = useRef<Group>(null)
  const capsule = useRef<Group>(null)
  const wake = useRef<Group>(null)
  const sparks = useRef<Points>(null)
  const sky = useMemo(() => buildSkyDome({ top: '#04081c', horizon: '#0d2048', bottom: '#060e26' }, 6000), [])
  const geo = useMemo(
    () => ({
      earth: earthSphere(),
      limb: atmosphere(),
      stars: stars(450, 5500, 11),
      shell: shellCap(4.9, 0.62, -2.47, 0.55),
      core: shellCap(4.75, 0.42, -2.2, 0.3),
      wakeOuter: wakeCone(2.7, 7, 70, [0.9, 0.22, 0.05], DIM),
      wakeMid: wakeCone(2.0, 4.2, 48, ORANGE, [0.4, 0.07, 0.03]),
      wakeCore: wakeCone(1.2, 2.2, 26, [1, 0.8, 0.4], [0.5, 0.15, 0.05]),
      sparks: (() => {
        const g = new BufferGeometry()
        g.setAttribute('position', new Float32BufferAttribute(new Float32Array(SPARKS * 3), 3))
        g.setAttribute('color', new Float32BufferAttribute(new Float32Array(SPARKS * 3), 3))
        return g
      })(),
    }),
    [],
  )
  const mats = useMemo(
    () => ({
      earth: new MeshBasicMaterial({ vertexColors: true, fog: false }),
      limb: new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false }),
      shell: glowMaterial(0.7),
      core: glowMaterial(0.9),
      wakeOuter: glowMaterial(1.2),
      wakeMid: glowMaterial(1.1),
      wakeCore: glowMaterial(1.0),
      sparks: new PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false }),
    }),
    [],
  )
  const seeds = useMemo(() => {
    const rng = createRng(21)
    return Array.from({ length: SPARKS }, () => [rng(), rng(), rng(), rng()] as const)
  }, [])

  useEffect(() => {
    return registerSystem('act5-entry', PRIORITY, (_dt, time) => {
      const on = act5State.view === 'entry'
      if (root.current) root.current.visible = on
      if (!on) return
      const g = entryGlow(act5State.t)
      const calm = flickerScale(gameStore.getState().settings.reducedMotion)
      const flick = 1 + (Math.sin(time * 23) * 0.06 + Math.sin(time * 37) * 0.05) * calm
      const shake = g * calm
      const cap = capsule.current
      if (cap) {
        // The module shakes slightly in the flow.
        cap.rotation.z = FLIGHT_ROLL + Math.sin(time * 31) * 0.012 * shake
        cap.rotation.x = Math.sin(time * 27) * 0.015 * shake
        cap.position.set(0, Math.sin(time * 41) * 0.03 * shake, Math.sin(time * 35) * 0.03 * shake)
      }
      mats.shell.uniforms.uGlow.value = g * 1.5 * flick
      mats.core.uniforms.uGlow.value = g * 1.6 * flick
      mats.wakeOuter.uniforms.uGlow.value = g * 0.7 * flick
      mats.wakeMid.uniforms.uGlow.value = g * 0.95 * flick
      mats.wakeCore.uniforms.uGlow.value = g * 1.1 * flick
      if (wake.current) {
        wake.current.visible = g > 0.01
        wake.current.scale.set(0.35 + 0.65 * g, 1, 1)
      }
      const sp = sparks.current
      if (sp) {
        sp.visible = g > 0.02
        const pos = sp.geometry.attributes.position
        const col = sp.geometry.attributes.color
        for (let i = 0; i < SPARKS; i++) {
          const p = particleAt(seeds[i], time)
          const fade = (1 - p.age) * g
          const flake = seeds[i][3] < 0.35
          pos.setXYZ(i, p.x, p.y, p.z)
          if (flake) col.setXYZ(i, 0.7 * fade, 0.3 * fade, 0.1 * fade)
          else col.setXYZ(i, 1 * fade, (0.55 + 0.35 * (1 - p.age)) * fade, 0.25 * fade)
        }
        pos.needsUpdate = true
        col.needsUpdate = true
      }
    })
  }, [mats, seeds])

  useEffect(
    () => () => {
      sky.dispose()
      Object.values(geo).forEach((x) => x.dispose())
      Object.values(mats).forEach((m) => m.dispose())
    },
    [sky, geo, mats],
  )

  return (
    <group ref={root} position={[ENTRY_X, 0, 0]} visible={false}>
      <primitive object={sky.mesh} />
      <points geometry={geo.stars} frustumCulled={false}>
        <pointsMaterial color="#ffffff" size={1} sizeAttenuation={false} fog={false} />
      </points>
      <group position={[0, -EARTH_DROP - EARTH_R, 0]}>
        <mesh geometry={geo.earth} material={mats.earth} frustumCulled={false} />
        <mesh geometry={geo.limb} material={mats.limb} frustumCulled={false} />
      </group>
      {/* Flight is toward +x. The heat shield leads, tilted ATTACK off the path. */}
      <group ref={capsule} rotation={[0, 0, FLIGHT_ROLL]}>
        <Capsule />
        <mesh geometry={geo.shell} material={mats.shell} frustumCulled={false} />
        <mesh geometry={geo.core} material={mats.core} frustumCulled={false} />
      </group>
      <group ref={wake} position={[-0.6, 0, 0]} visible={false}>
        <mesh geometry={geo.wakeOuter} material={mats.wakeOuter} frustumCulled={false} />
        <mesh geometry={geo.wakeMid} material={mats.wakeMid} frustumCulled={false} />
        <mesh geometry={geo.wakeCore} material={mats.wakeCore} frustumCulled={false} />
      </group>
      <points ref={sparks} geometry={geo.sparks} material={mats.sparks} frustumCulled={false} visible={false} />
    </group>
  )
}

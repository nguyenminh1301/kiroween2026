import { useEffect, useMemo } from 'react'
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createRng } from '../../procgen/rng'
import { act0State } from './state'
import { flashRate } from './crowdLogic'

export const CROWD_COUNT = 4000
const GROUND_Y = -100
const CROWD_PRIORITY = 700

const VERT = /* glsl */ `
uniform float uTime;
uniform float uExcite;
uniform float uFlashRate;
uniform vec2 uFog;
attribute vec4 aSeed;
attribute vec3 aShirt;
varying vec2 vUv;
varying vec3 vShirt;
varying vec3 vPants;
varying float vArms;
varying float vFlash;
varying float vFog;
void main() {
  vec3 base = instanceMatrix[3].xyz;
  float ph = aSeed.x * 6.2831;
  float hop = max(0.0, sin(uTime * (4.0 + aSeed.y * 4.0) + ph));
  float jumpy = step(aSeed.z, uExcite * uExcite * 1.3);
  float jump = jumpy * hop * hop * (0.6 + 1.6 * uExcite);
  vArms = jumpy * step(0.25, hop + 0.4 * uExcite);
  float flashOn = step(aSeed.y, uFlashRate) * step(fract(uTime * 0.3 + aSeed.w * 13.0), 0.06);
  vFlash = flashOn;
  vec4 mv = modelViewMatrix * vec4(base + vec3(0.0, jump, 0.0), 1.0);
  float big = 1.0 + flashOn * 1.2;
  vec2 q = vec2(position.x * 1.5, (position.y + 0.5) * 3.3) * big;
  if (flashOn > 0.5) q.y -= 1.2;
  mv.xy += q;
  vUv = uv;
  vShirt = aShirt;
  vPants = vec3(0.12 + aSeed.w * 0.2, 0.12 + aSeed.x * 0.12, 0.18 + aSeed.y * 0.2);
  vFog = smoothstep(uFog.x, uFog.y, length(mv.xyz));
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = /* glsl */ `
uniform vec3 uFogColor;
varying vec2 vUv;
varying vec3 vShirt;
varying vec3 vPants;
varying float vArms;
varying float vFlash;
varying float vFog;
void main() {
  vec3 col;
  if (vFlash > 0.5) {
    float d = length(vUv - vec2(0.5, 0.5));
    if (d > 0.3) discard;
    col = vec3(1.0, 0.98, 0.9);
  } else {
    // Local metres: x across 1.4 wide, y up 2.0 high.
    float x = (vUv.x - 0.5) * 1.4;
    float y = vUv.y * 2.0;
    float ax = abs(x);
    bool head = length(vec2(x, y - 1.66)) < 0.15;
    bool torso = ax < 0.2 && y > 0.8 && y < 1.5;
    bool legs = ax > 0.02 && ax < 0.17 && y < 0.8;
    bool armDown = vArms < 0.5 && ax >= 0.2 && ax < 0.3 && y > 0.85 && y < 1.45;
    bool armUp = vArms > 0.5 && ax >= 0.16 && ax < 0.3 && y > 1.45 && y < 2.0;
    if (!(head || torso || legs || armDown || armUp)) discard;
    col = head ? vec3(0.85, 0.65, 0.5) : (legs ? vPants : vShirt);
    if (armUp || armDown) col = vShirt;
  }
  col = mix(col, uFogColor, vFog);
  gl_FragColor = vec4(col, 1.0);
}
`

const SHIRTS = ['#d94a3d', '#f0e8d8', '#3d6fb8', '#e8b83a', '#4a9a5a', '#8e5aa8', '#e57a3a', '#2a2a30', '#b8c8d8']

function build(count: number) {
  const rng = createRng(1969)
  const geo = new PlaneGeometry(1, 1)
  const mesh = new InstancedMesh(geo, undefined, count)
  const seeds = new Float32Array(count * 4)
  const shirts = new Float32Array(count * 3)
  const m = new Matrix4()
  const c = new Color()
  for (let i = 0; i < count; i++) {
    const side = rng() < 0.5 ? -1 : 1
    const u = rng()
    const x = side * (45 + 215 * u * u)
    const z = (rng() - 0.45) * 280
    m.makeTranslation(x, GROUND_Y, z)
    mesh.setMatrixAt(i, m)
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = rng()
    c.set(SHIRTS[Math.floor(rng() * SHIRTS.length)])
    shirts[i * 3] = c.r
    shirts[i * 3 + 1] = c.g
    shirts[i * 3 + 2] = c.b
  }
  geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4))
  geo.setAttribute('aShirt', new InstancedBufferAttribute(shirts, 3))
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  return { mesh, geo }
}

/** About 4000 spectators on the ground, one instanced draw call. */
export function Crowd() {
  const { mesh, geo, material } = useMemo(() => {
    const b = build(CROWD_COUNT)
    const material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uExcite: { value: 0.15 },
        uFlashRate: { value: 0.05 },
        uFog: { value: new Vector2(120, 700) },
        uFogColor: { value: new Color('#c8b49a') },
      },
    })
    b.mesh.material = material
    return { ...b, material }
  }, [])

  useEffect(() => {
    const remove = registerSystem('act0-crowd', CROWD_PRIORITY, (_dt, t) => {
      material.uniforms.uTime.value = t
      material.uniforms.uExcite.value = act0State.excitement
      material.uniforms.uFlashRate.value = flashRate(act0State.excitement)
    })
    return () => {
      remove()
      geo.dispose()
      material.dispose()
      mesh.dispose()
    }
  }, [mesh, geo, material])

  return <primitive object={mesh} />
}

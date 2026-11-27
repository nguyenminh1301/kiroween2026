// The three repair props: the oxygen hose with its joint, pouch and hammer, the pressure gauge on the wall
// and the computer screen with its three buttons. All read `act2State.repairs` each frame.
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  CircleGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three'
import { audio } from '../../audio'
import { HUD } from '../../content/hud'
import { registerSystem } from '../../engine/frameDriver'
import { eyePosition } from '../../engine/playerBody'
import { getPlayerBody } from '../../engine/playerRuntime'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { cbox, ccyl, mergeColored } from './geo'
import { compButtonPos, COMP_SCREEN, gaugePos, JOINT_POS, POUCH_POS } from './layout'
import { BAND_HI, BAND_LO, needleAngle } from './repairs'
import { act2State } from './state'

const PRIORITY = 705
const HOSE_Z0 = -2.3
const HOSE_Z1 = 0.3

function hoseGeo(): BufferGeometry {
  const parts = [
    ccyl(0.04, HOSE_Z1 - HOSE_Z0, '#c9c6b8', 0, 0, (HOSE_Z0 + HOSE_Z1) / 2, 'z', 8),
    // The joint: a darker collar with a bright ring either side.
    ccyl(0.062, 0.14, '#5b5d5f', 0, 0, JOINT_POS.z, 'z', 8),
    ccyl(0.066, 0.025, '#b7b9ba', 0, 0, JOINT_POS.z - 0.09, 'z', 8),
    ccyl(0.066, 0.025, '#b7b9ba', 0, 0, JOINT_POS.z + 0.09, 'z', 8),
    // Clamps to the wall.
    cbox(0.16, 0.03, 0.05, '#6c7074', 0.06, 0, HOSE_Z0 + 0.3),
    cbox(0.16, 0.03, 0.05, '#6c7074', 0.06, 0, HOSE_Z1 - 0.3),
  ]
  return mergeColored(parts)
}

function pouchGeo(): BufferGeometry {
  return mergeColored([
    cbox(0.1, 0.22, 0.26, '#6d6a5a', 0, 0, 0),
    cbox(0.11, 0.07, 0.27, '#8c8a78', 0, 0.1, 0),
    cbox(0.02, 0.04, 0.06, '#d9d2bf', 0.055, 0.06, 0),
  ])
}

function hammerGeo(): BufferGeometry {
  return mergeColored([
    ccyl(0.012, 0.22, '#7a5a3a', 0, 0, 0, 'y', 6),
    cbox(0.1, 0.045, 0.045, '#8d9296', 0, 0.12, 0),
  ])
}

function canvasTex(w: number, h: number): { canvas: HTMLCanvasElement; tex: CanvasTexture } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new CanvasTexture(canvas)
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  return { canvas, tex }
}

function drawGauge(c: HTMLCanvasElement, psi: number): void {
  const g = c.getContext('2d')
  if (!g) return
  const w = c.width
  g.fillStyle = '#16181a'
  g.fillRect(0, 0, w, w)
  g.fillStyle = '#e8e3d2'
  g.beginPath()
  g.arc(w / 2, w / 2, w * 0.44, 0, Math.PI * 2)
  g.fill()
  const arc = (a0: number, a1: number, color: string): void => {
    g.strokeStyle = color
    g.lineWidth = w * 0.06
    g.beginPath()
    g.arc(w / 2, w / 2, w * 0.34, a0 - Math.PI / 2, a1 - Math.PI / 2)
    g.stroke()
  }
  arc(needleAngle(BAND_LO), needleAngle(BAND_HI), '#2f9e44')
  const a = needleAngle(psi) - Math.PI / 2
  g.strokeStyle = '#b3262a'
  g.lineWidth = w * 0.04
  g.beginPath()
  g.moveTo(w / 2, w / 2)
  g.lineTo(w / 2 + Math.cos(a) * w * 0.36, w / 2 + Math.sin(a) * w * 0.36)
  g.stroke()
  g.fillStyle = '#16181a'
  g.beginPath()
  g.arc(w / 2, w / 2, w * 0.04, 0, Math.PI * 2)
  g.fill()
}

function drawScreen(c: HTMLCanvasElement, cleared: boolean[], done: boolean): void {
  const g = c.getContext('2d')
  if (!g) return
  const { width: w, height: h } = c
  g.fillStyle = done ? '#0f5a2a' : '#140808'
  g.fillRect(0, 0, w, h)
  g.textBaseline = 'middle'
  if (done) {
    g.fillStyle = '#7dffa0'
    g.font = `bold ${h * 0.5}px monospace`
    g.textAlign = 'center'
    g.fillText(HUD.screen.ok, w / 2, h / 2)
    return
  }
  g.textAlign = 'left'
  g.font = `bold ${h * 0.16}px monospace`
  HUD.screen.errors.forEach((e, i) => {
    const y = h * (0.2 + 0.3 * i)
    g.fillStyle = cleared[i] ? '#2a3a2a' : '#ff4a3a'
    g.fillRect(w * 0.06, y - h * 0.09, w * 0.78, h * 0.18)
    g.fillStyle = cleared[i] ? '#4a6a4a' : '#240808'
    g.fillText(e, w * 0.1, y)
  })
}

export function RepairProps({ cmFar }: { cmFar: number }) {
  const hose = useMemo(hoseGeo, [])
  const pouch = useMemo(pouchGeo, [])
  const hammer = useMemo(hammerGeo, [])
  const puffGeo = useMemo(() => new IcosahedronGeometry(0.05, 0), [])
  const discGeo = useMemo(() => new CircleGeometry(0.14, 20), [])
  const bezelGeo = useMemo(() => new CircleGeometry(0.17, 20), [])
  const screenGeo = useMemo(() => new PlaneGeometry(0.8, 0.44), [])
  const frameGeo = useMemo(() => new PlaneGeometry(0.9, 0.54), [])
  const btnGeo = useMemo(() => new PlaneGeometry(0.1, 0.09), [])
  const gaugeTex = useMemo(() => canvasTex(64, 64), [])
  const screenTex = useMemo(() => canvasTex(128, 70), [])
  const mats = useMemo(
    () => ({
      vc: createMaterial({ vertexColors: true }),
      frame: createMaterial({ color: '#1c1e20' }),
      puff: new MeshBasicMaterial({ color: '#eef6ff', fog: false }),
      gauge: new MeshBasicMaterial({ map: gaugeTex.tex, fog: false }),
      screen: new MeshBasicMaterial({ map: screenTex.tex, fog: false }),
      btn: [0, 1, 2].map(() => new MeshBasicMaterial({ color: '#d63a2a', fog: false })),
    }),
    [gaugeTex, screenTex],
  )
  const hoseRef = useRef<Group>(null)
  const hammerRef = useRef<Group>(null)
  const puffs = useRef<Mesh[]>([])
  const gaugeGroup = useRef<Group>(null)

  useEffect(() => {
    const e = new Euler()
    const q = new Quaternion()
    const tilt = new Quaternion().setFromEuler(new Euler(-Math.PI / 2 + 0.5, 0, 0.2))
    const v = new Vector3()
    let lastGauge = -1
    let lastScreen = ''
    let hissClock = 0
    return registerSystem('act2-repairs', PRIORITY, (dt, t) => {
      const r = act2State.repairs.s
      // The hose rattles while the line hisses. Each tap kicks it for a moment.
      act2State.tapKick = Math.max(0, act2State.tapKick - dt * 4)
      const h = hoseRef.current
      if (h) {
        const rattle = r.o2Done ? 0 : 0.004 + 0.02 * act2State.tapKick
        h.position.set(JOINT_POS.x + Math.sin(t * 61) * rattle, JOINT_POS.y + Math.sin(t * 47) * rattle, 0)
      }
      puffs.current.forEach((m, i) => {
        if (!m) return
        const age = (t * 0.9 + i / puffs.current.length) % 1
        m.visible = !r.o2Done
        m.scale.setScalar(Math.sin(age * Math.PI) * (0.6 + 0.8 * age))
        m.position.set(-0.05 - age * 0.22, 0.03 + age * 0.12 * (1 + (i % 2)), JOINT_POS.z + ((i % 3) - 1) * 0.04)
      })
      // The hiss loops while the line is leaking and the player is in or near the tunnel.
      const body = getPlayerBody()
      if (!r.o2Done && body && Math.abs(body.pos.z - JOINT_POS.z) < 5) {
        hissClock -= dt
        if (hissClock <= 0) {
          hissClock = 2.1
          audio.play('hiss', { position: JOINT_POS })
        }
      }
      // The hammer rides in the player's hand.
      const hg = hammerRef.current
      if (hg) {
        hg.visible = r.hammerHeld && !!body
        if (hg.visible && body) {
          const eye = eyePosition(body)
          e.set(body.pitch, body.yaw, 0, 'YXZ')
          q.setFromEuler(e)
          const swing = act2State.tapKick * 0.5
          v.set(0.16, -0.14 + swing * 0.05, -0.36).applyQuaternion(q)
          hg.position.set(eye.x + v.x, eye.y + v.y, eye.z + v.z)
          hg.quaternion.copy(q).multiply(tilt)
          hg.rotateX(-swing)
        }
      }
      // Redraw the dial and the screen only when they change.
      const psiKey = Math.round(r.needle * 40)
      if (psiKey !== lastGauge) {
        lastGauge = psiKey
        drawGauge(gaugeTex.canvas, r.needle)
        gaugeTex.tex.needsUpdate = true
      }
      const key = `${r.cleared.join()}${r.compDone}`
      if (key !== lastScreen) {
        lastScreen = key
        drawScreen(screenTex.canvas, r.cleared, r.compDone)
        screenTex.tex.needsUpdate = true
        mats.btn.forEach((m, i) => m.color.set(r.cleared[i] ? '#2f9e44' : '#d63a2a'))
      }
    })
  }, [gaugeTex, screenTex, mats])

  useEffect(
    () => () => {
      ;[hose, pouch, hammer, puffGeo, discGeo, bezelGeo, screenGeo, frameGeo, btnGeo].forEach((g) => g.dispose())
      gaugeTex.tex.dispose()
      screenTex.tex.dispose()
      disposeMaterial(mats.vc)
      disposeMaterial(mats.frame)
      mats.puff.dispose()
      mats.gauge.dispose()
      mats.screen.dispose()
      mats.btn.forEach((m) => m.dispose())
    },
    [hose, pouch, hammer, puffGeo, discGeo, bezelGeo, screenGeo, frameGeo, btnGeo, gaugeTex, screenTex, mats],
  )

  const gp = gaugePos(cmFar)
  return (
    <>
      <group ref={hoseRef} position={[JOINT_POS.x, JOINT_POS.y, 0]}>
        <mesh geometry={hose} material={mats.vc} />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              if (m) puffs.current[i] = m
            }}
            geometry={puffGeo}
            material={mats.puff}
          />
        ))}
      </group>
      <mesh geometry={pouch} material={mats.vc} position={[POUCH_POS.x - 0.03, POUCH_POS.y, POUCH_POS.z]} />
      <group ref={hammerRef} visible={false}>
        <mesh geometry={hammer} material={mats.vc} />
      </group>
      <group ref={gaugeGroup} position={[gp.x + 0.03, gp.y, gp.z]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={bezelGeo} material={mats.frame} position={[0, 0, -0.004]} />
        <mesh geometry={discGeo} material={mats.gauge} />
      </group>
      <group position={[COMP_SCREEN.x, COMP_SCREEN.y, COMP_SCREEN.z]}>
        <mesh geometry={frameGeo} material={mats.frame} position={[0, 0, -0.004]} />
        <mesh geometry={screenGeo} material={mats.screen} />
      </group>
      {[0, 1, 2].map((i) => {
        const p = compButtonPos(i)
        return <mesh key={i} geometry={btnGeo} material={mats.btn[i]} position={[p.x, p.y, p.z - 0.005]} />
      })}
    </>
  )
}

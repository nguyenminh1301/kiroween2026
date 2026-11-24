import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, MeshBasicMaterial, PlaneGeometry, type Group, type Mesh } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import {
  ALARM_LOCAL,
  buildConsole,
  DIAL_LOCAL,
  MIDDLE,
  panelMatrix,
  SPOTS,
  toLocal,
} from './consoleGeo'
import { createDskyTexture } from './dskyTexture'
import { DSKY_POS, SWITCH_POS } from './layout'
import { act1State } from './state'

const CONSOLE_PRIORITY = 640

/** Needle angle for an engine level: sweeps from -2.2 rad to +2.2 rad. */
const needleAngle = (level: number): number => 2.2 - 4.4 * Math.min(1, Math.max(0, level))

export function Console() {
  const geo = useMemo(buildConsole, [])
  const bodyMat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const lampMat = useMemo(() => createMaterial({ kind: 'unlit', vertexColors: true, snap: false }), [])
  const dsky = useMemo(() => createDskyTexture(act1State.dsky), [])
  const dskyMat = useMemo(() => new MeshBasicMaterial({ map: dsky.texture }), [dsky])
  const dskyGeo = useMemo(() => new PlaneGeometry(0.09, 0.1125), [])
  const needleGeo = useMemo(() => {
    const g = new BoxGeometry(0.006, 0.05, 0.004)
    g.translate(0, 0.025, 0)
    return g
  }, [])
  const needleMat = useMemo(() => createMaterial({ kind: 'unlit', color: '#a8321f', snap: false }), [])
  const alarmGeo = useMemo(() => new BoxGeometry(0.07, 0.04, 0.02), [])
  const alarmMat = useMemo(() => new MeshBasicMaterial({ color: '#3a0e08' }), [])
  const leverGeo = useMemo(() => {
    const g = new BoxGeometry(0.022, 0.07, 0.022)
    g.translate(0, 0.035, 0)
    return g
  }, [])
  const leverMat = useMemo(() => createMaterial({ kind: 'unlit', color: '#c8301c', snap: false }), [])

  const needles = useRef<(Group | null)[]>([])
  const lever = useRef<Group>(null)
  const alarm = useRef<Mesh>(null)
  const seen = useRef(-1)
  const mid = useMemo(() => panelMatrix(MIDDLE), [])
  const swM = useMemo(() => panelMatrix(SPOTS.sw.panel), [])
  const dskyL = useMemo(() => toLocal(MIDDLE, DSKY_POS), [])
  const swL = useMemo(() => toLocal(SPOTS.sw.panel, SWITCH_POS), [])
  const lampOn = useRef(false)

  useEffect(() => {
    return registerSystem('act1-console', CONSOLE_PRIORITY, (_dt, t) => {
      if (seen.current !== act1State.dskyVersion) {
        seen.current = act1State.dskyVersion
        dsky.redraw(act1State.dsky)
      }
      const a = needleAngle(act1State.engine)
      for (const n of needles.current) if (n) n.rotation.z = a
      const on = act1State.alarm && Math.floor(t * 4) % 2 === 0
      if (on !== lampOn.current && alarm.current) {
        lampOn.current = on
        ;(alarm.current.material as MeshBasicMaterial).color.set(on ? '#ff2a1a' : '#3a0e08')
      }
      if (lever.current) lever.current.rotation.x = act1State.switchFlipped ? Math.PI - 0.7 : 0.7
    })
  }, [dsky])

  useEffect(
    () => () => {
      geo.body.dispose()
      geo.lamps.dispose()
      disposeMaterial(bodyMat)
      disposeMaterial(lampMat)
      disposeMaterial(needleMat)
      disposeMaterial(leverMat)
      dskyMat.dispose()
      alarmMat.dispose()
      dsky.dispose()
      ;[dskyGeo, needleGeo, alarmGeo, leverGeo].forEach((g) => g.dispose())
    },
    [geo, bodyMat, lampMat, needleMat, leverMat, dskyMat, alarmMat, dsky, dskyGeo, needleGeo, alarmGeo, leverGeo],
  )

  return (
    <>
      <mesh geometry={geo.body} material={bodyMat} />
      <mesh geometry={geo.lamps} material={lampMat} />
      <group matrix={mid} matrixAutoUpdate={false}>
        <mesh geometry={dskyGeo} material={dskyMat} position={[dskyL.x, dskyL.y, 0.032]} />
      </group>
      <group matrix={swM} matrixAutoUpdate={false}>
        <group ref={lever} position={[swL.x, swL.y, 0.04]}>
          <mesh geometry={leverGeo} material={leverMat} />
        </group>
      </group>
      <group matrix={mid} matrixAutoUpdate={false}>
        {DIAL_LOCAL.map((d, i) => (
          <group
            key={i}
            ref={(g) => {
              needles.current[i] = g
            }}
            position={[d.x, d.y, 0.04]}
          >
            <mesh geometry={needleGeo} material={needleMat} />
          </group>
        ))}
        <mesh ref={alarm} geometry={alarmGeo} material={alarmMat} position={[ALARM_LOCAL.x, ALARM_LOCAL.y, 0.03]} />
      </group>
    </>
  )
}

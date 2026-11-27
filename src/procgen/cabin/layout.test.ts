import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createBody, eyePosition } from '../../engine/playerBody'
import { DEFAULT_REACH } from '../../interaction/targeting'
import { buildFigure } from '../figure'
import { MIDDLE, panelMatrix } from './consoleGeo'
import type { Mesh } from 'three'
import {
  BODY_POS,
  CABIN_FOV,
  COUCH_X,
  CREW_ROOT_Z,
  DSKY_POS,
  EYE,
  HELMET_BODY_POS,
  HELMET_CENTER_Y,
  HELMET_CENTER_Z,
  HELMET_EYE,
  HELMET_FRONT_Z,
  HELMET_RADIUS,
  PANEL_COUNT,
  PANEL_H,
  PANEL_W,
  SEAT_PAN_Y,
  START_PITCH,
} from './layout'

/** The eye of a body seated at `pos`, as the camera sees it. */
const eyeOf = (pos: { x: number; y: number; z: number }) => eyePosition(createBody({ pos, mode: 'seated' }))

describe('seated eye in the middle couch (act 1 launch and TLI, and act 5)', () => {
  it('matches the helmet of a crewman seated in a couch, measured from the figure', () => {
    const f = buildFigure({ name: 'check', helmet: true })
    f.setPose('working', 0)
    f.root.position.set(COUCH_X[0], 0, CREW_ROOT_Z)
    f.root.rotation.y = Math.PI
    f.root.updateMatrixWorld(true)
    const p = new Vector3()
    f.head.getWorldPosition(p)
    expect(p.y).toBeCloseTo(HELMET_CENTER_Y, 1)
    expect(p.z).toBeCloseTo(HELMET_CENTER_Z, 1)
    f.dispose()
  })

  it('puts the eye 0.7 m above the seat pan, 0.1 m behind the front of the helmet, inside the helmet', () => {
    const eye = eyeOf(BODY_POS)
    expect(eye.y - SEAT_PAN_Y).toBeGreaterThan(0.65)
    expect(eye.y - SEAT_PAN_Y).toBeLessThan(0.75)
    expect(eye.z - HELMET_FRONT_Z).toBeCloseTo(0.1, 2)
    expect(Math.hypot(eye.y - HELMET_CENTER_Y, eye.z - HELMET_CENTER_Z)).toBeLessThan(HELMET_RADIUS)
    expect(eye.x).toBe(COUCH_X[1])
    expect(eye).toEqual(EYE)
  })

  it('uses the same eye in act 5, so it is never lower than the helmet', () => {
    expect(HELMET_EYE).toEqual(EYE)
    expect(eyeOf(HELMET_BODY_POS)).toEqual(EYE)
  })
})

describe('main panel against the eye', () => {
  const eye = eyeOf(BODY_POS)
  const c = new Vector3().setFromMatrixPosition(panelMatrix(MIDDLE))

  it('has its centre about 1.3 m from the eye, 0.1 to 0.3 m above it', () => {
    const d = Math.hypot(c.x - eye.x, c.y - eye.y, c.z - eye.z)
    expect(d).toBeGreaterThan(1.2)
    expect(d).toBeLessThan(1.4)
    expect(c.y - eye.y).toBeGreaterThanOrEqual(0.1)
    expect(c.y - eye.y).toBeLessThanOrEqual(0.3)
    expect(c.x).toBeCloseTo(eye.x, 5)
  })

  it('keeps the DSKY at the centre and within reach', () => {
    expect(Math.abs(DSKY_POS.x - eye.x)).toBeLessThan(0.3)
    expect(Math.hypot(DSKY_POS.x - eye.x, DSKY_POS.y - eye.y, DSKY_POS.z - eye.z)).toBeLessThan(DEFAULT_REACH)
    expect(DSKY_POS.z).toBeLessThan(eye.z - 0.4)
  })
})

/** The camera as the game sets it in the cabin: the seated eye, the start pitch, yaw 0 and the cabin field of view. */
function cabinCamera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(CABIN_FOV, 16 / 9, 0.05, 100)
  cam.position.copy(eyeOf(BODY_POS))
  cam.rotation.set(START_PITCH, 0, 0, 'YXZ')
  cam.updateMatrixWorld(true)
  cam.updateProjectionMatrix()
  return cam
}

describe('the start view in the cabin (acts 1 and 5)', () => {
  it('shows the whole main display console, all seven panels, with cabin around it', () => {
    const cam = cabinCamera()
    let top = -Infinity
    let bottom = Infinity
    let left = Infinity
    let right = -Infinity
    for (let i = 0; i < PANEL_COUNT; i++) {
      const m = panelMatrix(i)
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const p = new Vector3(sx * PANEL_W / 2, sy * PANEL_H / 2, 0).applyMatrix4(m).project(cam)
        expect(p.z).toBeLessThan(1)
        top = Math.max(top, p.y)
        bottom = Math.min(bottom, p.y)
        left = Math.min(left, p.x)
        right = Math.max(right, p.x)
      }
    }
    // Side panels of the cabin at the edges, hull and window frames above, gloves below.
    expect(left).toBeGreaterThan(-0.9)
    expect(right).toBeLessThan(0.9)
    expect(top).toBeLessThan(0.6)
    expect(bottom).toBeGreaterThan(-0.6)
  })

  it('keeps the crewmen out of the middle third of the frame', () => {
    const cam = cabinCamera()
    for (const x of [COUCH_X[0], COUCH_X[2]]) {
      const f = buildFigure({ helmet: true })
      f.root.position.set(x, 0, CREW_ROOT_Z)
      f.root.rotation.y = Math.PI
      for (let t = 0; t < 9; t += 0.75) {
        f.setPose('working', t)
        f.root.updateMatrixWorld(true)
        f.root.traverse((o) => {
          const mesh = o as Mesh
          if (!mesh.isMesh) return
          const pos = mesh.geometry.attributes.position
          const v = new Vector3()
          for (let k = 0; k < pos.count; k++) {
            v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld)
            const view = v.clone().applyMatrix4(cam.matrixWorldInverse)
            if (view.z > -0.05) continue
            const p = v.project(cam)
            if (Math.abs(p.y) > 1 || Math.abs(p.x) > 1) continue
            expect(Math.abs(p.x), `crewman at x ${x}, t ${t}`).toBeGreaterThan(1 / 3)
          }
        })
      }
      f.dispose()
    }
  })
})

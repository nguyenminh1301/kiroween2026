import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createBody, eyePosition } from '../../engine/playerBody'
import { DEFAULT_REACH } from '../../interaction/targeting'
import { buildFigure } from '../figure'
import { MIDDLE, panelMatrix } from './consoleGeo'
import {
  BODY_POS,
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
  SEAT_PAN_Y,
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

  it('has its centre about 0.7 m in front of the eye and 0.1 to 0.3 m above it', () => {
    expect(eye.z - c.z).toBeGreaterThan(0.65)
    expect(eye.z - c.z).toBeLessThan(0.75)
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

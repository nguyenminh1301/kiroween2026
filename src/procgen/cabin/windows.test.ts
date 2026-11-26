import { describe, expect, it } from 'vitest'
import { wallRadius } from './cabinGeo'
import { EYE, SHELL_SIDES } from './layout'
import { earthDisc, EARTH_DIR, starAt, texelDirection, windowDefs } from './windows'

const defs = windowDefs()
const win = (k: string) => defs.find((d) => d.key === k)!

describe('cabin windows', () => {
  it('has five windows: hatch, left, right and two forward rendezvous windows', () => {
    expect(defs.map((d) => d.key).sort()).toEqual(['hatch', 'left', 'rdvLeft', 'rdvRight', 'right'])
    expect(win('hatch').round).toBe(true)
    for (const k of ['rdvLeft', 'rdvRight']) expect(win(k).w).toBeLessThan(win('right').w)
  })

  it('lies flat on the shell: corners sit at the wall within a few millimetres', () => {
    for (const d of defs.filter((w) => w.key !== 'hatch')) {
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const p = {
          x: d.center.x + d.x.x * sx * d.w / 2 + d.y.x * sy * d.h / 2,
          y: d.center.y + d.x.y * sx * d.w / 2 + d.y.y * sy * d.h / 2,
          z: d.center.z + d.x.z * sx * d.w / 2 + d.y.z * sy * d.h / 2,
        }
        const radial = Math.hypot(p.x, p.z)
        // Apothem of the face at that height; the face is flat, so the radial distance varies a little across it.
        const apothem = wallRadius(p.y) * Math.cos(Math.PI / SHELL_SIDES)
        expect(radial).toBeGreaterThan(apothem - 0.05)
        expect(radial).toBeLessThan(apothem / Math.cos(Math.PI / SHELL_SIDES) + 0.01)
      }
    }
  })

  it('faces into the cabin', () => {
    for (const d of defs) {
      const toEye = { x: EYE.x - d.center.x, y: EYE.y - d.center.y, z: EYE.z - d.center.z }
      expect(toEye.x * d.z.x + toEye.y * d.z.y + toEye.z * d.z.z).toBeGreaterThan(0)
    }
  })

  it('shows the Earth through the right window only', () => {
    const hits = (k: string) => {
      const d = win(k)
      let n = 0
      for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) if (earthDisc(texelDirection(d, 32, 24, x, y))) n++
      return n
    }
    expect(hits('right')).toBeGreaterThan(40)
    for (const k of ['left', 'hatch', 'rdvLeft', 'rdvRight']) expect(hits(k)).toBe(0)
  })

  it('keeps the whole Earth disc inside the right window', () => {
    const d = win('right')
    // The disc edge points, as seen from the eye, project inside the window opening.
    let outside = 0
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2
      const r = 0.13
      const up = { x: 0, y: 1, z: 0 }
      const right = { x: EARTH_DIR.z * 0 + 0, y: 0, z: 1 }
      const e = {
        x: EARTH_DIR.x + (right.x * Math.cos(ang) + up.x * Math.sin(ang)) * r,
        y: EARTH_DIR.y + (right.y * Math.cos(ang) + up.y * Math.sin(ang)) * r,
        z: EARTH_DIR.z + (right.z * Math.cos(ang) + up.z * Math.sin(ang)) * r,
      }
      // Intersect the eye ray with the window plane.
      const denom = e.x * d.z.x + e.y * d.z.y + e.z * d.z.z
      const t = ((d.center.x - EYE.x) * d.z.x + (d.center.y - EYE.y) * d.z.y + (d.center.z - EYE.z) * d.z.z) / denom
      const p = { x: EYE.x + e.x * t - d.center.x, y: EYE.y + e.y * t - d.center.y, z: EYE.z + e.z * t - d.center.z }
      const lx = p.x * d.x.x + p.y * d.x.y + p.z * d.x.z
      const ly = p.x * d.y.x + p.y * d.y.y + p.z * d.y.z
      if (Math.abs(lx) > d.w / 2 || Math.abs(ly) > d.h / 2) outside++
    }
    expect(outside).toBe(0)
  })

  it('puts the same star in the same direction', () => {
    const dir = { x: 0.3, y: 0.5, z: -0.81 }
    expect(starAt(dir)).toBe(starAt({ ...dir }))
    let stars = 0
    for (let i = 0; i < 4000; i++) if (starAt({ x: Math.sin(i), y: Math.cos(i * 0.37), z: -0.7 }) > 0) stars++
    expect(stars).toBeGreaterThan(0)
  })
})

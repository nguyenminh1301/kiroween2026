import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  DEFAULT_WALK_SPEED,
  SEATED_PITCH_LIMIT,
  SEATED_YAW_LIMIT,
  launch,
  stepSeated,
  stepWalk,
  stepZeroG,
  type WalkConfig,
} from './movement'
import { createInputState, type InputState } from './input'
import { createBody, type PlayerBody } from './playerBody'
import type { Box } from './collision'
import type { MoveMode, Vec3 } from '../types'

const RUNS = { numRuns: 200 }
const EPS = 1e-6

const num = (lo: number, hi: number) => fc.double({ min: lo, max: hi, noNaN: true, noDefaultInfinity: true })
const vec = (lim: number): fc.Arbitrary<Vec3> => fc.record({ x: num(-lim, lim), y: num(-lim, lim), z: num(-lim, lim) })
const dtArb = num(0.001, 0.05)
const modeArb = fc.constantFrom<MoveMode>('walk', 'zeroG', 'seated')

const bodyArb: fc.Arbitrary<PlayerBody> = fc.record({
  pos: vec(100),
  vel: vec(10),
  yaw: num(-10, 10),
  pitch: num(-10, 10),
  mode: modeArb,
})

const heldArb = fc.record({ forward: fc.boolean(), back: fc.boolean(), left: fc.boolean(), right: fc.boolean() })

function inputWith(held: Partial<InputState['held']>, pressed: Partial<InputState['pressed']> = {}): InputState {
  const s = createInputState()
  Object.assign(s.held, held)
  Object.assign(s.pressed, pressed)
  return s
}

const horiz = (v: Vec3) => Math.hypot(v.x, v.z)

describe('stepWalk', () => {
  // Feature: engine-core, Property 17: Walk speed and diagonal clamp
  // **Validates: Requirements 9.1, 9.2, 9.3**
  it('Property 17: horizontal speed never exceeds the configured speed', () => {
    fc.assert(
      fc.property(bodyArb, heldArb, num(0.1, 10), dtArb, fc.boolean(), (b, held, speed, dt, custom) => {
        const cfg: WalkConfig = custom ? { gravity: 9.81, speed } : { gravity: 9.81 }
        const limit = custom ? speed : DEFAULT_WALK_SPEED
        const out = stepWalk({ ...b, mode: 'walk' }, inputWith(held), dt, cfg)
        expect(horiz(out.vel)).toBeLessThanOrEqual(limit + EPS)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 17: Walk speed and diagonal clamp
  it('Property 17: a single held direction achieves exactly the speed, along yaw', () => {
    fc.assert(
      fc.property(
        num(-10, 10),
        num(0.1, 10),
        dtArb,
        fc.constantFrom('forward', 'back', 'left', 'right' as const),
        (yaw, speed, dt, dir) => {
          const out = stepWalk(createBody({ yaw }), inputWith({ [dir]: true }), dt, { gravity: 9.81, speed })
          expect(horiz(out.vel)).toBeCloseTo(speed, 6)
        },
      ),
      RUNS,
    )
    const fwd = stepWalk(createBody(), inputWith({ forward: true }), 0.05, { gravity: 9.81 })
    expect(fwd.vel.z).toBeCloseTo(-1.4, 9)
  })

  // Feature: engine-core, Property 17: Walk speed and diagonal clamp
  it('Property 17: opposing directions cancel', () => {
    fc.assert(
      fc.property(num(-10, 10), dtArb, (yaw, dt) => {
        const out = stepWalk(createBody({ yaw }), inputWith({ forward: true, back: true, left: true, right: true }), dt, {
          gravity: 9.81,
        })
        expect(horiz(out.vel)).toBeLessThanOrEqual(EPS)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 18: Pitch clamp invariant
  // **Validates: Requirements 9.5**
  it('Property 18: pitch stays within +-90 degrees across any sequence of deltas', () => {
    fc.assert(
      fc.property(num(-20, 20), fc.array(num(-5, 5), { minLength: 1, maxLength: 30 }), (start, deltas) => {
        let b = createBody({ pitch: start })
        for (const d of deltas) {
          b = stepWalk(b, createInputState(), 0.016, { gravity: 0, ground: () => 0 })
          expect(Math.abs(b.pitch)).toBeLessThanOrEqual(Math.PI / 2 + 1e-12)
          b = { ...b, pitch: b.pitch + d }
        }
        b = stepWalk(b, createInputState(), 0.016, { gravity: 0 })
        expect(Math.abs(b.pitch)).toBeLessThanOrEqual(Math.PI / 2 + 1e-12)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 19: Ground following and no bounce
  // **Validates: Requirements 9.6, 9.7, 9.8**
  it('Property 19: feet track a sloped ground function with no oscillation', () => {
    fc.assert(
      fc.property(
        num(-0.5, 0.5),
        num(-0.5, 0.5),
        num(-3, 3),
        fc.array(fc.tuple(heldArb, num(-4, 4)), { minLength: 1, maxLength: 40 }),
        (sx, sz, h0, steps) => {
          const ground = (x: number, z: number) => h0 + sx * x + sz * z
          let b = createBody({ pos: { x: 0, y: ground(0, 0), z: 0 } })
          for (const [held, yaw] of steps) {
            b = stepWalk({ ...b, yaw }, inputWith(held), 0.05, { gravity: 9.81, ground })
            expect(Math.abs(b.pos.y - ground(b.pos.x, b.pos.z))).toBeLessThanOrEqual(1e-9)
            expect(b.vel.y).toBe(0)
          }
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 19: Ground following and no bounce
  it('Property 19: feet stay on a box top used as the floor', () => {
    fc.assert(
      fc.property(
        num(-2, 5),
        fc.array(fc.tuple(heldArb, num(-4, 4)), { minLength: 1, maxLength: 40 }),
        (top, steps) => {
          const boxes: Box[] = [{ min: { x: -50, y: top - 1, z: -50 }, max: { x: 50, y: top, z: 50 } }]
          let b = createBody({ pos: { x: 0, y: top, z: 0 } })
          for (const [held, yaw] of steps) {
            b = stepWalk({ ...b, yaw }, inputWith(held), 0.05, { gravity: 9.81, boxes })
            expect(Math.abs(b.pos.y - top)).toBeLessThanOrEqual(1e-6)
            expect(Math.abs(b.vel.y)).toBeLessThanOrEqual(1e-6)
          }
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 20: Jump trigger
  // **Validates: Requirements 9.9, 9.10, 9.11**
  it('Property 20: jump sets takeoff speed iff grounded and enabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        num(0.5, 6),
        num(-5, 5),
        dtArb,
        (grounded, enabled, takeoff, airVy, dt) => {
          const b = grounded
            ? createBody({ pos: { x: 0, y: 0, z: 0 } })
            : createBody({ pos: { x: 0, y: 50, z: 0 }, vel: { x: 0, y: airVy, z: 0 } })
          const cfg: WalkConfig = enabled
            ? { gravity: 1.62, ground: () => 0, jump: { takeoffSpeed: takeoff } }
            : { gravity: 1.62, ground: () => 0 }
          const pressed = stepWalk(b, inputWith({}, { holdBreath: true }), dt, cfg)
          const idle = stepWalk(b, inputWith({}), dt, cfg)
          if (grounded && enabled) {
            expect(pressed.vel.y).toBe(takeoff)
            expect(idle.vel.y).toBe(0)
          } else {
            expect(pressed.vel.y).toBe(idle.vel.y)
          }
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 21: Gravity integration while airborne
  // **Validates: Requirements 9.4, 9.13**
  it('Property 21: airborne vertical velocity drops by gravity * dt', () => {
    fc.assert(
      fc.property(num(0.1, 20), num(-5, 5), dtArb, (g, vy, dt) => {
        const b = createBody({ pos: { x: 0, y: 50, z: 0 }, vel: { x: 0, y: vy, z: 0 } })
        const out = stepWalk(b, createInputState(), dt, { gravity: g, ground: () => 0 })
        expect(out.vel.y).toBeCloseTo(vy - g * dt, 9)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 21: Gravity integration while airborne
  it('Property 21: landing stops the fall at floor height', () => {
    fc.assert(
      fc.property(num(0.1, 20), num(0.001, 0.05), num(-30, -10), (g, h, vy) => {
        const b = createBody({ pos: { x: 0, y: h, z: 0 }, vel: { x: 0, y: vy, z: 0 } })
        const out = stepWalk(b, createInputState(), 0.05, { gravity: g, ground: () => 0 })
        expect(out.pos.y).toBe(0)
        expect(out.vel.y).toBe(0)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 22: Zero dt is a no-op
  // **Validates: Requirements 9.14**
  it('Property 22: dt = 0 returns an equal body', () => {
    fc.assert(
      fc.property(bodyArb, heldArb, num(0.1, 10), fc.boolean(), (b, held, g, withGround) => {
        const cfg: WalkConfig = withGround ? { gravity: g, ground: () => 0 } : { gravity: g }
        expect(stepWalk(b, inputWith(held, { holdBreath: true }), 0, cfg)).toEqual(b)
        expect(stepZeroG(b, 0)).toEqual(b)
      }),
      RUNS,
    )
  })
})

describe('stepZeroG and launch', () => {
  const A = Math.LN2 / 0.5

  // Feature: engine-core, Property 23: Zero-g ignores directional input, decays and integrates
  // **Validates: Requirements 10.1, 10.2, 10.3**
  it('Property 23: velocity decays by exp(-ln2/0.5 dt) and position integrates', () => {
    fc.assert(
      fc.property(bodyArb, dtArb, (b, dt) => {
        const out = stepZeroG({ ...b, mode: 'zeroG' }, dt)
        const f = Math.exp(-A * dt)
        for (const k of ['x', 'y', 'z'] as const) {
          expect(out.vel[k]).toBeCloseTo(b.vel[k] * f, 9)
          expect(out.pos[k]).toBeCloseTo(b.pos[k] + out.vel[k] * dt, 9)
        }
        expect(out.yaw).toBe(b.yaw)
        expect(out.pitch).toBe(b.pitch)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 23: Zero-g ignores directional input, decays and integrates
  it('Property 23: velocity halves every 0.5 s', () => {
    const b = createBody({ vel: { x: 4, y: 0, z: 0 }, mode: 'zeroG' })
    let cur = b
    for (let i = 0; i < 50; i++) cur = stepZeroG(cur, 0.01)
    expect(cur.vel.x).toBeCloseTo(2, 9)
  })

  // Feature: engine-core, Property 24: Launch impulse
  // **Validates: Requirements 10.4, 10.6, 10.7**
  it('Property 24: launch adds normalize(dir) * 1.5 ln2 / 0.5', () => {
    const speed = (1.5 * Math.LN2) / 0.5
    const dirArb = vec(1e3).filter((d) => Math.hypot(d.x, d.y, d.z) > 1e-3)
    fc.assert(
      fc.property(bodyArb, dirArb, (b, dir) => {
        const out = launch(b, dir)
        const l = Math.hypot(dir.x, dir.y, dir.z)
        expect(out.vel.x).toBeCloseTo(b.vel.x + (dir.x / l) * speed, 9)
        expect(out.vel.y).toBeCloseTo(b.vel.y + (dir.y / l) * speed, 9)
        expect(out.vel.z).toBeCloseTo(b.vel.z + (dir.z / l) * speed, 9)
        expect(out.pos).toEqual(b.pos)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 24: Launch impulse
  it('Property 24: zero-length dir leaves velocity unchanged', () => {
    fc.assert(
      fc.property(bodyArb, (b) => {
        expect(launch(b, { x: 0, y: 0, z: 0 }).vel).toEqual(b.vel)
      }),
      RUNS,
    )
  })

  // Feature: engine-core, Property 25: Launch drift distance across step sizes
  // **Validates: Requirements 10.5, 10.10**
  it('Property 25: drift after a launch from rest is within 5% of 1.5 m for any dt', () => {
    fc.assert(
      fc.property(num(0.001, 0.05), vec(1).filter((d) => Math.hypot(d.x, d.y, d.z) > 1e-2), (dt, dir) => {
        let b = launch(createBody({ mode: 'zeroG' }), dir)
        const steps = Math.ceil(15 / dt)
        for (let i = 0; i < steps; i++) b = stepZeroG(b, dt)
        const dist = Math.hypot(b.pos.x, b.pos.y, b.pos.z)
        expect(Math.abs(dist - 1.5) / 1.5).toBeLessThanOrEqual(0.05)
      }),
      RUNS,
    )
  })
})

describe('stepSeated', () => {
  const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  // Feature: engine-core, Property 27: Seated clamps and fixed position
  // **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**
  it('Property 27: position fixed, velocity zero, yaw within 100 and pitch within 80 degrees', () => {
    const seatYaw = fc.oneof(num(-Math.PI, Math.PI), fc.constantFrom(Math.PI, -Math.PI, Math.PI - 0.01, 0, 3.1, -3.1))
    fc.assert(
      fc.property(
        seatYaw,
        bodyArb,
        fc.array(fc.tuple(num(-20, 20), num(-20, 20)), { minLength: 1, maxLength: 20 }),
        (seat, start, deltas) => {
          let b: PlayerBody = { ...start, mode: 'seated' }
          const pos = { ...b.pos }
          for (const [dy, dp] of deltas) {
            b = stepSeated(b, dy, dp, { seatForwardYaw: seat })
            expect(b.pos).toEqual(pos)
            expect(b.vel).toEqual({ x: 0, y: 0, z: 0 })
            expect(Math.abs(angDiff(b.yaw, seat))).toBeLessThanOrEqual(SEATED_YAW_LIMIT + 1e-9)
            expect(Math.abs(b.pitch)).toBeLessThanOrEqual(SEATED_PITCH_LIMIT + 1e-12)
          }
        },
      ),
      RUNS,
    )
  })

  // Feature: engine-core, Property 27: Seated clamps and fixed position
  it('Property 27: look inside the limits passes through, across the wrap boundary', () => {
    const b = createBody({ yaw: Math.PI - 0.1, mode: 'seated' })
    const out = stepSeated(b, 0.2, 0, { seatForwardYaw: Math.PI })
    expect(angDiff(out.yaw, Math.PI - 0.1 + 0.2)).toBeCloseTo(0, 9)
  })
})

describe('stepSeated custom limits', () => {
  it('clamps yaw and pitch to the given limits', () => {
    const lim = (30 * Math.PI) / 180
    const b = stepSeated(createBody({ yaw: 0, mode: 'seated' }), 2, 2, { seatForwardYaw: 0, yawLimit: lim, pitchLimit: lim })
    expect(b.yaw).toBeCloseTo(lim)
    expect(b.pitch).toBeCloseTo(lim)
  })
})

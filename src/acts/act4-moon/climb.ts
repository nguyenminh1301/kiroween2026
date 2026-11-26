// The ladder animation: eye path down from the hatch to the dust, and back up. Pure: no Three.js or React.
// The path is a function of time, so it can be paused, tested and replayed. Eye positions are world metres.
import type { Vec3 } from '../../types'
import { CABIN_EYE, EVA_START, LADDER_FOOT, PAD_TOP, PORCH, RUNGS, ladderZ, rungY } from './layout'

export const DOWN_SECONDS = 8
export const UP_SECONDS = 5
export const MOON_G = 1.62

export type ClimbStage = 'crawl' | 'turn' | 'ladder' | 'drop' | 'step' | 'approach' | 'jump' | 'porch' | 'enter'

export interface ClimbFrame {
  eye: Vec3
  stage: ClimbStage
  /** Rung contacts so far; each new one is a clang. */
  clangs: number
  /** Hands on the rails or the floor, drawn at the bottom of the view. */
  hands: boolean
  /** Advances while the hands work, radians. */
  handPhase: number
  /** Feet on the ground when the animation ends (down), for the hand-over. */
  done: boolean
}

const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const smooth = (x: number): number => {
  const c = clamp01(x)
  return c * c * (3 - 2 * c)
}
const mix = (a: Vec3, b: Vec3, f: number): Vec3 => ({ x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f) })

const EYE = 1.65
/** Standing on rung `i`: the body hangs 0.42 m out from the rungs, eyes about 1 m above the foot. */
const onRung = (i: number): Vec3 => ({ x: 0, y: rungY(i) + 1.0, z: ladderZ(rungY(i)) + 0.42 })
const PORCH_CRAWL: Vec3 = { x: 0, y: PORCH.y + 0.8, z: PORCH.z }
const PAD_EYE: Vec3 = { x: 0, y: PAD_TOP + EYE, z: LADDER_FOOT.z }
const DUST_EYE: Vec3 = { x: EVA_START.x, y: EYE, z: EVA_START.z }
/** The drop starts from the bottom rung, hands let go. */
const DROP_FROM_Y = rungY(0)
const DROP_SECONDS = Math.sqrt((2 * (DROP_FROM_Y - PAD_TOP)) / MOON_G)

const T = {
  crawl: 2.2,
  turn: 3.2,
  ladder: 6.0,
  drop: 6.0 + DROP_SECONDS,
  settle: 6.0 + DROP_SECONDS + 0.25,
}

export function climbDownAt(t: number): ClimbFrame {
  const f = (eye: Vec3, stage: ClimbStage, clangs: number, hands: boolean, handPhase: number, done = false): ClimbFrame => ({ eye, stage, clangs, hands, handPhase, done })
  if (t <= 0) return f({ ...CABIN_EYE }, 'crawl', 0, true, 0)
  if (t < T.crawl) {
    const u = smooth(t / T.crawl)
    // Backing out on hands and knees: the eye stays low, then rises to the porch crawl height.
    return f(mix(CABIN_EYE, PORCH_CRAWL, u), 'crawl', 0, true, t * 5)
  }
  if (t < T.turn) {
    const u = smooth((t - T.crawl) / (T.turn - T.crawl))
    return f(mix(PORCH_CRAWL, onRung(RUNGS - 1), u), 'turn', 0, true, 0)
  }
  if (t < T.ladder) {
    const span = T.ladder - T.turn
    const k = ((t - T.turn) / span) * (RUNGS - 1)
    const step = Math.min(RUNGS - 2, Math.floor(k))
    const u = smooth(k - step)
    const from = onRung(RUNGS - 1 - step)
    const to = onRung(RUNGS - 2 - step)
    return f(mix(from, to, u), 'ladder', 1 + Math.floor(k + 0.5), true, k * Math.PI)
  }
  if (t < T.drop) {
    const tau = t - T.ladder
    const fall = 0.5 * MOON_G * tau * tau
    const z = lerp(onRung(0).z - 0.42, LADDER_FOOT.z, tau / DROP_SECONDS)
    return f({ x: 0, y: DROP_FROM_Y - fall + EYE - 0.1, z }, 'drop', RUNGS, false, 0)
  }
  if (t < T.settle) {
    const u = (t - T.drop) / (T.settle - T.drop)
    // Knees bend on landing, then straighten.
    return f({ ...PAD_EYE, y: PAD_EYE.y - 0.14 * Math.sin(Math.PI * u) }, 'drop', RUNGS, false, 0)
  }
  const u = smooth((t - T.settle) / (DOWN_SECONDS - T.settle))
  const eye = mix(PAD_EYE, DUST_EYE, u)
  eye.y += 0.12 * Math.sin(Math.PI * clamp01((t - T.settle) / (DOWN_SECONDS - T.settle)))
  return f(eye, 'step', RUNGS, false, 0, t >= DOWN_SECONDS)
}

const U = { approach: 0.6, jump: 1.5, ladder: 3.26, porch: 3.96 }

/** Back up: step to the pad, a small jump to the first rung, up the rungs, onto the porch and in. */
export function climbUpAt(t: number, from: Vec3 = DUST_EYE): ClimbFrame {
  const f = (eye: Vec3, stage: ClimbStage, clangs: number, hands: boolean, handPhase: number, done = false): ClimbFrame => ({ eye, stage, clangs, hands, handPhase, done })
  if (t < U.approach) return f(mix(from, PAD_EYE, smooth(t / U.approach)), 'approach', 0, false, 0)
  if (t < U.jump) {
    const u = (t - U.approach) / (U.jump - U.approach)
    // A small jump in low gravity: up and a little past the first rung height, then settle onto it.
    const e = mix(PAD_EYE, onRung(0), smooth(u))
    e.y += 0.25 * Math.sin(Math.PI * u)
    return f(e, 'jump', u > 0.85 ? 1 : 0, u > 0.5, 0)
  }
  if (t < U.ladder) {
    const k = ((t - U.jump) / (U.ladder - U.jump)) * (RUNGS - 1)
    const step = Math.min(RUNGS - 2, Math.floor(k))
    return f(mix(onRung(step), onRung(step + 1), smooth(k - step)), 'ladder', 1 + Math.floor(k + 0.5), true, k * Math.PI)
  }
  if (t < U.porch) {
    const u = smooth((t - U.ladder) / (U.porch - U.ladder))
    return f(mix(onRung(RUNGS - 1), PORCH_CRAWL, u), 'porch', RUNGS, true, 0)
  }
  const u = smooth((t - U.porch) / (UP_SECONDS - U.porch))
  return f(mix(PORCH_CRAWL, CABIN_EYE, u), 'enter', RUNGS, true, t * 5, t >= UP_SECONDS)
}

// The creature's brain: patrol, alert, hunt, search, return, and the scripted encounter. Pure.
import { canHear, canSee } from './hearing'
import { headingTo, nearestS, PATROL_SPEED, pointAt, route, type Pt } from './patrol'

export type MonsterMode = 'patrol' | 'alert' | 'hunt' | 'search' | 'return' | 'encounter' | 'scripted' | 'crawl'
export type MonsterAnim = 'walk' | 'freeze' | 'crawl'
export type MonsterEvent = 'sound' | 'alert' | 'lost' | 'caught' | 'encounterEnd'

export const HUNT_SPEED = 1.45
export const ENCOUNTER_SPEED = 1.4
export const ALERT_SECONDS = 1.8
export const SEARCH_SECONDS = 2.5
export const CATCH_RANGE = 0.8
export const ENCOUNTER_STOP_Z = -7.2
export const ENCOUNTER_PAUSE = 2.5
/** The creature stops this far from the player, inside the flashlight cone. */
export const ENCOUNTER_STOP_DIST = 3.5
/** Patrol distance of the first doorway outside point, where the patrol resumes after the encounter. */
export const RESUME_S = 15

export interface Monster {
  pos: Pt
  heading: number
  mode: MonsterMode
  anim: MonsterAnim
  /** Distance along the patrol loop. */
  s: number
  timer: number
  lastKnown: Pt | null
  soundIn: number
  path: Pt[]
  phase: 'door' | 'out' | 'pause' | 'back'
}

export interface MonsterCtx {
  dt: number
  player: Pt
  hidden: boolean
  holding: boolean
  noise: number
  /** 0 to 1. */
  rng: () => number
}

const nextSound = (rng: () => number): number => 2.5 + rng() * 3

export function createMonster(s = 0, rng: () => number = Math.random): Monster {
  const p = pointAt(s)
  return {
    pos: { x: p.x, z: p.z },
    heading: p.heading,
    mode: 'patrol',
    anim: 'walk',
    s,
    timer: 0,
    lastKnown: null,
    soundIn: nextSound(rng),
    path: [],
    phase: 'door',
  }
}

/** Walk along `m.path` at `speed`. Returns true when the path is finished. */
function follow(m: Monster, speed: number, dt: number): boolean {
  let left = speed * dt
  while (m.path.length > 0 && left > 0) {
    const t = m.path[0]
    const dx = t.x - m.pos.x
    const dz = t.z - m.pos.z
    const d = Math.hypot(dx, dz)
    if (d > 1e-6) m.heading = headingTo(m.pos, t)
    if (d <= left) {
      m.pos = { x: t.x, z: t.z }
      left -= d
      m.path.shift()
    } else {
      m.pos = { x: m.pos.x + (dx / d) * left, z: m.pos.z + (dz / d) * left }
      left = 0
    }
  }
  return m.path.length === 0
}

/** Start the scripted walk out of the first doorway. */
export function startEncounter(m: Monster): void {
  m.mode = 'encounter'
  m.anim = 'walk'
  m.phase = 'door'
  m.pos = { x: 3, z: -16.25 }
  m.path = [{ x: 0, z: -16.25 }]
  m.timer = 0
  m.lastKnown = null
}

/** Put the creature under direct control (reveal and chase). */
export function setScripted(m: Monster, mode: 'scripted' | 'crawl', pos: Pt, heading: number): void {
  m.mode = mode
  m.anim = mode === 'crawl' ? 'crawl' : 'freeze'
  m.pos = { x: pos.x, z: pos.z }
  m.heading = heading
}

/** Put the creature back on the patrol loop at `s`. */
export function resumePatrol(m: Monster, s: number): void {
  const p = pointAt(s)
  m.mode = 'patrol'
  m.anim = 'walk'
  m.s = s
  m.pos = { x: p.x, z: p.z }
  m.heading = p.heading
  m.path = []
  m.lastKnown = null
}

function detects(m: Monster, c: MonsterCtx): boolean {
  const d = Math.hypot(c.player.x - m.pos.x, c.player.z - m.pos.z)
  const here = { x: m.pos.x, y: 0, z: m.pos.z }
  const there = { x: c.player.x, y: 0, z: c.player.z }
  return canHear(c.noise, d, c.hidden, c.holding) || canSee(here, m.heading, there, c.hidden)
}

function hunt(m: Monster, target: Pt): void {
  m.mode = 'hunt'
  m.anim = 'walk'
  m.lastKnown = { x: target.x, z: target.z }
  m.path = route(m.pos, m.lastKnown)
}

/** Advance the creature one frame. Returns the events of this frame. */
export function stepMonster(m: Monster, c: MonsterCtx): MonsterEvent[] {
  const events: MonsterEvent[] = []
  const dt = c.dt
  if (m.mode === 'scripted' || m.mode === 'crawl') return events

  const dist = Math.hypot(c.player.x - m.pos.x, c.player.z - m.pos.z)
  if (!c.hidden && dist < CATCH_RANGE) {
    events.push('caught')
    return events
  }

  m.soundIn -= dt
  if (m.soundIn <= 0 && m.anim !== 'freeze') {
    m.soundIn = nextSound(c.rng)
    events.push('sound')
  }

  switch (m.mode) {
    case 'encounter': {
      if (m.phase === 'door') {
        if (follow(m, ENCOUNTER_SPEED, dt)) m.phase = 'out'
      } else if (m.phase === 'out') {
        // Past the doorway, walk up the corridor until 3.5 m from the player.
        const near = Math.hypot(c.player.x - m.pos.x, c.player.z - m.pos.z) <= ENCOUNTER_STOP_DIST
        let arrived = false
        if (!near) {
          // The point on the corridor line that is 3.5 m from the player.
          const dz = Math.sqrt(Math.max(0, ENCOUNTER_STOP_DIST ** 2 - c.player.x ** 2))
          const stopZ = c.player.z > m.pos.z ? Math.min(c.player.z - dz, ENCOUNTER_STOP_Z) : c.player.z + dz
          m.path = [{ x: 0, z: stopZ }]
          arrived = follow(m, ENCOUNTER_SPEED, dt)
        }
        if (near || arrived) {
          m.path = []
          m.phase = 'pause'
          m.anim = 'freeze'
          m.timer = ENCOUNTER_PAUSE
        }
      } else if (m.phase === 'pause') {
        m.heading = headingTo(m.pos, c.player)
        m.timer -= dt
        if (m.timer <= 0) {
          m.phase = 'back'
          m.anim = 'walk'
          m.path = [{ x: 0, z: -16.25 }, { x: 3, z: -16.25 }]
        }
      } else if (follow(m, ENCOUNTER_SPEED, dt)) {
        resumePatrol(m, RESUME_S)
        events.push('encounterEnd')
      }
      return events
    }
    case 'patrol': {
      m.s += PATROL_SPEED * dt
      const p = pointAt(m.s)
      m.pos = { x: p.x, z: p.z }
      m.heading = p.heading
      break
    }
    case 'return': {
      if (follow(m, PATROL_SPEED, dt)) resumePatrol(m, nearestS(m.pos))
      break
    }
    case 'alert': {
      m.timer -= dt
      m.heading = headingTo(m.pos, c.player)
      if (detects(m, c)) m.lastKnown = { ...c.player }
      if (m.timer <= 0) hunt(m, m.lastKnown ?? c.player)
      return events
    }
    case 'hunt': {
      if (detects(m, c)) {
        m.lastKnown = { ...c.player }
        m.path = route(m.pos, m.lastKnown)
      }
      if (follow(m, HUNT_SPEED, dt)) {
        m.mode = 'search'
        m.anim = 'freeze'
        m.timer = SEARCH_SECONDS
      }
      return events
    }
    case 'search': {
      m.timer -= dt
      if (detects(m, c)) {
        hunt(m, c.player)
        return events
      }
      if (m.timer <= 0) {
        events.push('lost')
        m.mode = 'return'
        m.anim = 'walk'
        const home = pointAt(nearestS(m.pos))
        m.path = route(m.pos, { x: home.x, z: home.z })
      }
      return events
    }
  }

  if (detects(m, c)) {
    m.mode = 'alert'
    m.anim = 'freeze'
    m.timer = ALERT_SECONDS
    m.heading = headingTo(m.pos, c.player)
    m.lastKnown = { ...c.player }
    events.push('alert')
  }
  return events
}

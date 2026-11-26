// The creature's brain: patrol, peek, alert, hunt the last place a noise was heard, search, go back to patrol.
// It walks a path of waypoints and never enters a hiding spot: the caller maps a noise heard from a hiding
// spot to the spot's outside point. Pure.
import { canHear, canSee } from './hearing'
import { dist, headingTo, nearbyNodes, nearestPatrol, PATROL_SPEED, route, type Nav, type Pt } from './patrol'

export type MonsterMode = 'patrol' | 'peek' | 'alert' | 'hunt' | 'search' | 'scripted' | 'crawl'
export type MonsterAnim = 'walk' | 'freeze' | 'crawl'
/** `click`, `scrape` and `breath` are quiet. `step` and `scream` happen only in a chase. */
export type MonsterEvent = 'click' | 'scrape' | 'breath' | 'step' | 'scream' | 'alert' | 'lost' | 'caught'

export const HUNT_SPEED = 1.45
export const ALERT_SECONDS = 0.8
/** Standing still where it heard the noise, then walking to a couple of nearby points. */
export const STAND_SECONDS = 2
export const SEARCH_SECONDS = 6
export const SEARCH_RADIUS = 5
export const CATCH_RANGE = 0.8
export const AMBIENT_MIN = 8
export const AMBIENT_MAX = 15
export const STEP_EVERY = 0.5
export const PEEK_CHANCE = 0.35
export const PEEK_PAUSE = 2

export interface Monster {
  pos: Pt
  heading: number
  mode: MonsterMode
  anim: MonsterAnim
  /** Index of the patrol waypoint it walks to next. */
  patrolIdx: number
  timer: number
  /** Seconds left of the search. */
  search: number
  /** The last place it heard a noise. */
  target: Pt | null
  path: Pt[]
  /** Seconds to the next quiet sound. */
  ambientIn: number
  stepIn: number
  /** Standing at the end of a peek or at the search spot. */
  standing: boolean
}

export interface MonsterCtx {
  dt: number
  /** The player's real position. */
  player: Pt
  /** Where a noise from the player counts as: the spot's outside point when hidden. */
  heard: Pt
  hidden: boolean
  holding: boolean
  noise: number
  /** 0 to 1. */
  rng: () => number
}

const nextAmbient = (rng: () => number): number => AMBIENT_MIN + rng() * (AMBIENT_MAX - AMBIENT_MIN)

export function createMonster(nav: Nav, patrolIdx = 0, rng: () => number = Math.random): Monster {
  const i = ((patrolIdx % nav.patrol.length) + nav.patrol.length) % nav.patrol.length
  const p = nav.patrol[i]
  const next = nav.patrol[(i + 1) % nav.patrol.length]
  return {
    pos: { x: p.x, z: p.z },
    heading: headingTo(p, next),
    mode: 'patrol',
    anim: 'walk',
    patrolIdx: (i + 1) % nav.patrol.length,
    timer: 0,
    search: 0,
    target: null,
    path: [],
    ambientIn: nextAmbient(rng),
    stepIn: 0,
    standing: false,
  }
}

/** Walk along `m.path` at `speed`, facing the way it walks. Returns true when the path is finished. */
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

/** Put the creature under direct control. */
export function setScripted(m: Monster, mode: 'scripted' | 'crawl', pos: Pt, heading: number): void {
  m.mode = mode
  m.anim = mode === 'crawl' ? 'crawl' : 'freeze'
  m.pos = { x: pos.x, z: pos.z }
  m.heading = heading
}

/** Put the creature back on its patrol at waypoint `idx`. */
export function resumePatrol(m: Monster, nav: Nav, idx: number): void {
  m.mode = 'patrol'
  m.anim = 'walk'
  m.patrolIdx = ((idx % nav.patrol.length) + nav.patrol.length) % nav.patrol.length
  m.path = []
  m.target = null
  m.standing = false
}

function startHunt(m: Monster, nav: Nav, where: Pt): void {
  m.mode = 'hunt'
  m.anim = 'walk'
  m.standing = false
  m.target = { x: where.x, z: where.z }
  m.path = route(nav, m.pos, m.target)
  m.stepIn = 0
}

/** Advance the creature one frame. Returns the events of this frame. */
export function stepMonster(m: Monster, c: MonsterCtx, nav: Nav): MonsterEvent[] {
  const events: MonsterEvent[] = []
  const dt = c.dt
  if (m.mode === 'scripted' || m.mode === 'crawl') return events

  const d = dist(c.player, m.pos)
  if (!c.hidden && d < CATCH_RANGE) {
    events.push('caught')
    return events
  }

  // A quiet click, scrape or breath now and then. Not in a chase: the chase has its own sounds.
  m.ambientIn -= dt
  if (m.ambientIn <= 0) {
    m.ambientIn = nextAmbient(c.rng)
    if (m.mode !== 'hunt' && m.mode !== 'alert') events.push((['click', 'scrape', 'breath'] as const)[Math.floor(c.rng() * 3) % 3])
  }

  // What it notices: a noise (placed at `heard`), or the player very close in the open (placed where they are).
  const here = { x: m.pos.x, y: 0, z: m.pos.z }
  const there = { x: c.player.x, y: 0, z: c.player.z }
  const sees = canSee(here, m.heading, there, c.hidden)
  const hears = canHear(c.noise, d, c.hidden, c.holding)
  const noticed: Pt | null = sees ? { x: c.player.x, z: c.player.z } : hears ? c.heard : null

  switch (m.mode) {
    case 'patrol': {
      if (noticed) return notice(m, noticed, events)
      if (m.path.length === 0) m.path = route(nav, m.pos, nav.patrol[m.patrolIdx])
      if (follow(m, PATROL_SPEED, dt)) {
        m.patrolIdx = (m.patrolIdx + 1) % nav.patrol.length
        if (nav.peeks.length > 0 && c.rng() < PEEK_CHANCE) {
          const spot = nav.peeks[Math.floor(c.rng() * nav.peeks.length) % nav.peeks.length]
          m.mode = 'peek'
          m.standing = false
          m.path = route(nav, m.pos, spot)
        }
      }
      return events
    }
    case 'peek': {
      if (noticed) return notice(m, noticed, events)
      if (!m.standing) {
        if (follow(m, PATROL_SPEED, dt)) {
          m.standing = true
          m.anim = 'freeze'
          m.timer = PEEK_PAUSE
          events.push('breath')
        }
      } else {
        m.timer -= dt
        if (m.timer <= 0) {
          m.mode = 'patrol'
          m.anim = 'walk'
          m.standing = false
          m.path = []
        }
      }
      return events
    }
    case 'alert': {
      m.timer -= dt
      if (noticed) m.target = { ...noticed }
      if (m.target) m.heading = headingTo(m.pos, m.target)
      if (m.timer <= 0 && m.target) {
        startHunt(m, nav, m.target)
        events.push('scream')
      }
      return events
    }
    case 'hunt': {
      // A fresh noise moves the target to where it was heard. The player is never tracked.
      if (noticed && m.target && dist(noticed, m.target) > 0.5) startHunt(m, nav, noticed)
      m.stepIn -= dt
      if (m.stepIn <= 0) {
        m.stepIn = STEP_EVERY
        events.push('step')
      }
      if (follow(m, HUNT_SPEED, dt)) {
        m.mode = 'search'
        m.anim = 'freeze'
        m.standing = true
        m.timer = STAND_SECONDS
        m.search = SEARCH_SECONDS
        events.push('breath')
      }
      return events
    }
    case 'search': {
      if (noticed) {
        startHunt(m, nav, noticed)
        events.push('alert')
        return events
      }
      m.search -= dt
      if (m.standing) {
        m.timer -= dt
        if (m.timer <= 0) {
          m.standing = false
          m.anim = 'walk'
          m.path = []
          for (const n of nearbyNodes(nav, m.pos, SEARCH_RADIUS, 2, c.rng)) m.path.push(...route(nav, m.path[m.path.length - 1] ?? m.pos, n))
        }
      } else if (follow(m, PATROL_SPEED, dt)) {
        m.standing = true
        m.anim = 'freeze'
        m.timer = 1
      }
      if (m.search <= 0) {
        events.push('lost')
        resumePatrol(m, nav, nearestPatrol(nav, m.pos))
      }
      return events
    }
  }
  return events
}

function notice(m: Monster, where: Pt, events: MonsterEvent[]): MonsterEvent[] {
  m.mode = 'alert'
  m.anim = 'freeze'
  m.standing = false
  m.timer = ALERT_SECONDS
  m.target = { x: where.x, z: where.z }
  m.path = []
  m.heading = headingTo(m.pos, where)
  events.push('alert')
  return events
}

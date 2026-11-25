import { audio } from '../audio'
import type { LoadableId } from '../engine/actLoader'
import { getAct4Info, getSandboxInfo, getSandboxInstances, type Act4Info } from '../engine/debugInfo'
import { frameDriver } from '../engine/frameDriver'
import { markLockWasHeld, resumeGame } from '../engine/inputRuntime'
import type { PlayerBody } from '../engine/playerBody'
import { getPlayerBody, launchPlayer, updatePlayerBody } from '../engine/playerRuntime'
import { gameStore } from '../engine/store'
import { getDirector, type DirectorSnapshot } from '../director/snapshot'
import { getInteractables } from '../interaction/interactables'
import { focus } from '../interaction/Focus'
import type { Vec3 } from '../types'
import { adaptiveScaler } from '../render/adaptiveScaler'
import { installRenderDebug, type RenderDebug } from '../render/renderDebug'
import { getRenderStats } from '../render/renderStats'
import type { RenderStats } from '../render/stats'
import type { Screen } from '../engine/store'
import { getActiveTimeline } from '../engine/unloadReset'
import { loader } from './loader'
import { goScreen } from './session'

export const DEBUG_VERSION = '0.1.0'

export interface LosDebug {
  version: string
  store: typeof gameStore
  loader: {
    state: { getState(): { status: 'idle' | 'loading' | 'ready' | 'error' | 'finished'; act: LoadableId | null; checkpoint: string | null } }
    loadAct(id: LoadableId, checkpoint?: string): Promise<void>
  }
  player: {
    readonly body: PlayerBody | null
    set(partial: Partial<PlayerBody>): void
    launch(dir: Vec3): void
  }
  focus(): boolean
  /** Time in seconds of the running Timeline, or null when none runs. */
  timeline(): number | null
  interactables(): { id: string; verb: string; position: Vec3; enabled: boolean }[]
  lock: { markHeld(held?: boolean): void; resume(): void }
  sandbox: {
    /** Wall box and inner Z face, zero-g zone, or null when the sandbox is not loaded. */
    info(): ReturnType<typeof getSandboxInfo>
    /** Test Timeline time in seconds, or null if none started. */
    timelineTime(): number | null
    /** Number of live sandbox instances. Must be 0 or 1. */
    instances(): number
  }
  /** Live render numbers. Each read returns the latest values. */
  stats: RenderStats
  render: RenderDebug
  audio: { loaded(): string[]; playing(): string[]; radioQueue(): string[] }
  ui: { go(screen: Screen): void }
  /** Act 3 only: phase, alert, noise, hearing threshold and the creature. Null in other acts. */
  readonly director: DirectorSnapshot | null
  /** Act 4 only: phase, timeline time, carried item, tasks done and the creature. Null in other acts. */
  readonly act4: Act4Info | null
  /** Number of registered frame systems. */
  systemCount(): number
}

export function isDebug(search: string): boolean {
  return new URLSearchParams(search).has('debug')
}

/** Sets window.__los when the URL has ?debug. Later specs add fields. Never rename it. */
export function installDebug(win: Window = window): void {
  if (!isDebug(win.location.search)) return
  win.__los = {
    version: DEBUG_VERSION,
    store: gameStore,
    loader: {
      state: { getState: () => loader.getState() },
      loadAct: (id, checkpoint) => loader.loadAct(id, checkpoint),
    },
    player: {
      get body() {
        return getPlayerBody()
      },
      set: (partial) => updatePlayerBody(partial),
      launch: (dir) => launchPlayer(dir),
    },
    focus: () => focus.isFocusActive(),
    timeline: () => {
      const t = getActiveTimeline()
      return t && !t.finished ? t.time() : null
    },
    interactables: () =>
      getInteractables().map((i) => ({ id: i.id, verb: i.verb, position: { ...i.position }, enabled: i.enabled() })),
    lock: { markHeld: (held = true) => markLockWasHeld(held), resume: () => resumeGame() },
    sandbox: {
      info: () => getSandboxInfo(),
      timelineTime: () => getSandboxInfo()?.testTimelineTime() ?? null,
      instances: () => getSandboxInstances(),
    },
    stats: getRenderStats(),
    render: installRenderDebug(adaptiveScaler),
    audio: { loaded: () => audio.loaded(), playing: () => audio.playing(), radioQueue: () => audio.radioQueue() },
    ui: { go: (screen) => goScreen(screen) },
    get director() {
      return getDirector()
    },
    get act4() {
      return getAct4Info()
    },
    systemCount: () => frameDriver.systemCount(),
  }
}

import type { LoadableId } from '../engine/actLoader'
import { getSandboxInfo, getSandboxInstances } from '../engine/debugInfo'
import { frameDriver } from '../engine/frameDriver'
import { markLockWasHeld } from '../engine/inputRuntime'
import type { PlayerBody } from '../engine/playerBody'
import { getPlayerBody, launchPlayer, updatePlayerBody } from '../engine/playerRuntime'
import { gameStore } from '../engine/store'
import { focus } from '../interaction/Focus'
import type { Vec3 } from '../types'
import { loader } from './loader'

export const DEBUG_VERSION = '0.1.0'

export interface LosDebug {
  version: string
  store: typeof gameStore
  loader: {
    state: { getState(): { status: 'idle' | 'loading' | 'ready' | 'error'; act: LoadableId | null; checkpoint: string | null } }
    loadAct(id: LoadableId, checkpoint?: string): Promise<void>
  }
  player: {
    readonly body: PlayerBody | null
    set(partial: Partial<PlayerBody>): void
    launch(dir: Vec3): void
  }
  focus(): boolean
  lock: { markHeld(held?: boolean): void }
  sandbox: {
    /** Wall box and inner Z face, zero-g zone, or null when the sandbox is not loaded. */
    info(): ReturnType<typeof getSandboxInfo>
    /** Test Timeline time in seconds, or null if none started. */
    timelineTime(): number | null
    /** Number of live sandbox instances. Must be 0 or 1. */
    instances(): number
  }
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
    lock: { markHeld: (held = true) => markLockWasHeld(held) },
    sandbox: {
      info: () => getSandboxInfo(),
      timelineTime: () => getSandboxInfo()?.testTimelineTime() ?? null,
      instances: () => getSandboxInstances(),
    },
    systemCount: () => frameDriver.systemCount(),
  }
}

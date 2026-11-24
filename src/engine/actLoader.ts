import type { ComponentType } from 'react'
import type { ActId } from '../types'
import type { CleanupRegistry } from './cleanupRegistry'
import type { gameStore } from './store'
import { resetOnUnload } from './unloadReset'

/** The dev-only sandbox is loadable like an act but is not part of ActId. */
export type LoadableId = ActId | 'sandbox'

export interface Act_Module {
  id: LoadableId
  /** First entry is the act start. */
  checkpoints: string[]
  Scene: ComponentType
  start(checkpoint: string): void
}

export interface LoaderState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  act: LoadableId | null
  checkpoint: string | null
}

/** Returns the requested checkpoint if the act has it, otherwise the first one. */
export function resolveCheckpoint(checkpoints: string[], requested: string | undefined): string {
  if (requested !== undefined && checkpoints.includes(requested)) return requested
  return checkpoints[0] ?? 'start'
}

export interface ActLoaderDeps {
  importAct: (id: LoadableId) => Promise<Act_Module>
  cleanupRegistry: CleanupRegistry
  store: typeof gameStore
  allowed: (id: LoadableId) => boolean
  /** Engine reset run after the act cleanups. Defaults to `resetOnUnload` (Timeline, Focus, moveMode, objective, target). */
  onUnload?: () => void
}

export interface ActLoader {
  getState(): LoaderState
  loadAct(id: LoadableId, checkpoint?: string): Promise<void>
  /** The module of the currently active act, or null. */
  getModule(): Act_Module | null
  subscribe(listener: () => void): () => void
}

export function createActLoader(deps: ActLoaderDeps): ActLoader {
  const { importAct, cleanupRegistry, store, allowed } = deps
  const onUnload = deps.onUnload ?? (() => resetOnUnload({ store }))
  let latestToken = 0
  let state: LoaderState = { status: 'idle', act: null, checkpoint: null }
  let activeModule: Act_Module | null = null
  const listeners = new Set<() => void>()

  function setState(next: LoaderState): void {
    state = next
    for (const l of [...listeners]) l()
  }

  function unloadCurrent(): void {
    activeModule = null
    cleanupRegistry.runAll()
    try {
      onUnload()
    } catch (err) {
      console.error('unload reset failed', err)
    }
    store.getState().setAct(null)
    store.getState().setCheckpoint(null)
  }

  async function loadAct(id: LoadableId, checkpoint?: string): Promise<void> {
    const token = ++latestToken
    unloadCurrent()
    setState({ status: 'loading', act: null, checkpoint: null })

    if (!allowed(id)) {
      setState({ status: 'error', act: null, checkpoint: null })
      return
    }

    let mod: Act_Module
    try {
      mod = await importAct(id)
    } catch {
      if (token === latestToken) setState({ status: 'error', act: null, checkpoint: null })
      return
    }
    if (token !== latestToken) return

    const resolved = resolveCheckpoint(mod.checkpoints, checkpoint)
    try {
      mod.start(resolved)
    } catch (err) {
      console.error('act start failed', err)
      unloadCurrent()
      setState({ status: 'error', act: null, checkpoint: null })
      return
    }
    activeModule = mod
    if (id !== 'sandbox') store.getState().setAct(id)
    store.getState().setCheckpoint(resolved)
    setState({ status: 'ready', act: id, checkpoint: resolved })
  }

  return {
    getState: () => state,
    loadAct,
    getModule: () => activeModule,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

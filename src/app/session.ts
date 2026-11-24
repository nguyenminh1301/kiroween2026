// Starting, restarting and leaving a run, and the chapter card.
import { requestLock } from '../engine/inputRuntime'
import { gameStore, type Screen } from '../engine/store'
import type { ActId } from '../types'
import { markRestart } from './chapterCard'
import { startAction } from './flow'
import { loader } from './loader'

export function playAct(id: ActId, checkpoint?: string, opts: { restart?: boolean } = {}): Promise<void> {
  const s = gameStore.getState()
  s.setPaused(false)
  s.setScreen('game')
  requestLock()
  markRestart(opts.restart === true)
  return loader.loadAct(id, checkpoint)
}

/** Start a new run at act 0. */
export function startRun(): Promise<void> {
  gameStore.getState().resetAnomalies()
  return playAct(startAction().act)
}

export function pickChapter(id: ActId): Promise<void> {
  return playAct(id)
}

export function restartCheckpoint(): Promise<void> {
  const s = gameStore.getState()
  if (!s.act) return Promise.resolve()
  return playAct(s.act, s.checkpoint ?? undefined, { restart: true })
}

export function quitToTitle(): void {
  loader.unload()
  const s = gameStore.getState()
  s.setPaused(false)
  s.setScreen('title')
}

export function goScreen(screen: Screen): void {
  gameStore.getState().setScreen(screen)
}

/** Show the Archive when the loader reports finished. Call once from boot. */
export function wireFinish(): void {
  loader.subscribe(() => {
    if (loader.getState().status !== 'finished') return
    const s = gameStore.getState()
    s.setPaused(false)
    s.setScreen('archive')
  })
}

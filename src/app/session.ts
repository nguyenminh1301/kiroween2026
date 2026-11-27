// Starting, restarting and leaving a run, and the chapter card.
import { hostMessage, isEmbedded, postToHost } from '../engine/hostBridge'
import { requestLock } from '../engine/inputRuntime'
import { gameStore, type Screen } from '../engine/store'
import type { ActId } from '../types'
import { markRestart } from './chapterCard'
import { ARTICLE_END_HASH, END_FADE_MS, articleUrl, startAction } from './flow'
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
  gameStore.getState().setPlayed(true)
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

/** Leave the game for the article page. Stops the act first so nothing keeps playing. */
export function leaveToArticle(hash = ''): void {
  loader.unload()
  const s = gameStore.getState()
  s.setPaused(false)
  // Inside the article's game window the article does the rest.
  if (isEmbedded()) {
    postToHost(hash === ARTICLE_END_HASH ? hostMessage.end() : hostMessage.leave())
    return
  }
  window.location.assign(articleUrl(hash))
}

export function goScreen(screen: Screen): void {
  gameStore.getState().setScreen(screen)
}

/** When the loader reports finished, fade to black and open the article at "What really happened". Call once from boot. */
export function wireFinish(): void {
  loader.subscribe(() => {
    if (loader.getState().status !== 'finished') return
    const s = gameStore.getState()
    s.setPaused(false)
    s.setScreen('leaving')
    window.setTimeout(() => leaveToArticle(ARTICLE_END_HASH), END_FADE_MS + 100)
  })
}

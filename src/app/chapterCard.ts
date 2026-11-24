import type { Act_Module, LoadableId } from '../engine/actLoader'
import { cleanupRegistry } from '../engine/cleanupRegistry'
import { fxStore } from '../engine/fx'
import { gameStore } from '../engine/store'
import { cardDurationMs, shouldShowCard } from './flow'

let restartFlag = false

/** The next load is a restart from a checkpoint, so it shows no card. */
export function markRestart(restart: boolean): void {
  restartFlag = restart
}

/** Loader hook. Shows the chapter card and stops game time until it ends. */
export function chapterBeforeStart(id: LoadableId, checkpoint: string, mod: Act_Module): void {
  const restart = restartFlag
  restartFlag = false
  if (id === 'sandbox') return
  const intro = mod.intro
  if (!intro || !shouldShowCard({ intro, checkpoint, firstCheckpoint: mod.checkpoints[0], restart })) return
  fxStore.getState().setCard(intro)
  gameStore.getState().setPaused(true)
  const timer = setTimeout(() => {
    fxStore.getState().setCard(null)
    gameStore.getState().setPaused(false)
  }, cardDurationMs(intro))
  cleanupRegistry.register(() => clearTimeout(timer))
}


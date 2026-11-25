import { isDebugUrl } from '../engine/inputRuntime'
import { startPersistence } from '../engine/persistence'
import { setCompleteHandler, setRestartHandler } from '../engine/actFlow'
import { gameStore } from '../engine/store'
import { installDebug } from './debug'
import { startInteraction } from '../interaction/interactionRuntime'
import { readEnv } from './env'
import { initialScreen } from './flow'
import { loader } from './loader'
import { startIdleHint } from '../ui/idleHint'
import { playAct, restartCheckpoint, wireFinish } from './session'

/** Runs once at startup, outside React so StrictMode cannot repeat it. */
export function boot(): void {
  startPersistence(gameStore)
  installDebug()
  startInteraction()
  wireFinish()
  startIdleHint()
  setCompleteHandler((_from, next) => {
    if (next) void playAct(next)
    else loader.finish()
  })
  setRestartHandler(() => void restartCheckpoint())
  gameStore.getState().setScreen(isDebugUrl() ? 'game' : initialScreen(readEnv()))
  if (isDebugUrl()) void loader.loadAct('sandbox')
}

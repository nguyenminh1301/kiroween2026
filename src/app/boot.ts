import { hostMessage, postToHost } from '../engine/hostBridge'
import { isDebugUrl } from '../engine/inputRuntime'
import { startPersistence } from '../engine/persistence'
import { importAct } from '../acts/registry'
import { setCompleteHandler, setPreloadHandler, setRestartHandler } from '../engine/actFlow'
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
  gameStore.subscribe((s, prev) => {
    if (s.act !== prev.act) postToHost(hostMessage.act(s.act))
  })
  startIdleHint()
  setCompleteHandler((_from, next) => {
    if (next) void playAct(next)
    else loader.finish()
  })
  setPreloadHandler((next) => void importAct(next).catch(() => {}))
  setRestartHandler(() => void restartCheckpoint())
  gameStore.getState().setScreen(isDebugUrl() ? 'game' : initialScreen(readEnv()))
  if (isDebugUrl()) void loader.loadAct('sandbox')
}

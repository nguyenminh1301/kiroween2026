import { isDebugUrl } from '../engine/inputRuntime'
import { startPersistence } from '../engine/persistence'
import { gameStore } from '../engine/store'
import { installDebug } from './debug'
import { startInteraction } from '../interaction/interactionRuntime'
import { loader } from './loader'

/** Runs once at startup, outside React so StrictMode cannot repeat it. */
export function boot(): void {
  startPersistence(gameStore)
  installDebug()
  startInteraction()
  if (isDebugUrl()) void loader.loadAct('sandbox')
}

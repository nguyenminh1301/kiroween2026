import { importAct } from '../acts/registry'
import { createActLoader, type LoadableId } from '../engine/actLoader'
import { cleanupRegistry } from '../engine/cleanupRegistry'
import { isDebugUrl } from '../engine/inputRuntime'
import { holdRender } from '../engine/renderHold'
import { gameStore } from '../engine/store'
import { chapterBeforeStart } from './chapterCard'

/** The one Act_Loader the app uses. The sandbox is allowed only when the URL has ?debug. */
export const loader = createActLoader({
  importAct,
  cleanupRegistry,
  store: gameStore,
  beforeStart: chapterBeforeStart,
  allowed: (id: LoadableId) => id !== 'sandbox' || isDebugUrl(),
})

// Loading and act changes are slow by nature. The picture level ignores them.
loader.subscribe(() => holdRender())

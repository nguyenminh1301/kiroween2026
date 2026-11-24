import type { Act_Module } from '../engine/actLoader'
import type { ActId } from '../types'

type ActImport = () => Promise<{ act: Act_Module }>

/**
 * One dynamic import per act, so each act is its own build chunk.
 * The dev-only sandbox is added to the loader's import function by the app wiring.
 */
export const ACT_IMPORTS: Record<ActId, ActImport> = {
  'act0-pad': () => import('./act0-pad'),
  'act1-launch': () => import('./act1-launch'),
  'act2-coast': () => import('./act2-coast'),
  'act3-farside': () => import('./act3-farside'),
  'act4-moon': () => import('./act4-moon'),
  'act5-home': () => import('./act5-home'),
}

/** The dev-only sandbox, in its own chunk. The loader's `allowed` gate keeps it behind ?debug. */
const SANDBOX_IMPORT: ActImport = () => import('./sandbox')

/** Import an act module by id. Rejects for ids that are not in the map. */
export async function importAct(id: string): Promise<Act_Module> {
  const load = id === 'sandbox' ? SANDBOX_IMPORT : (ACT_IMPORTS as Record<string, ActImport | undefined>)[id]
  if (!load) throw new Error(`unknown act: ${id}`)
  return (await load()).act
}

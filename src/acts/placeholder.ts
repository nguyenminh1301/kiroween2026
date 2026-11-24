import { CHAPTER_INTROS } from '../content/chapters'
import type { Act_Module } from '../engine/actLoader'
import type { ActId } from '../types'

/** Scene for placeholder acts: renders nothing. */
function EmptyScene(): null {
  return null
}

/** Builds a trivial Act_Module. Later specs replace each placeholder with the real act. */
export function createPlaceholderAct(id: ActId, checkpoints: string[]): Act_Module {
  return {
    id,
    checkpoints,
    intro: CHAPTER_INTROS[id],
    Scene: EmptyScene,
    start() {
      // Nothing to set up yet.
    },
  }
}

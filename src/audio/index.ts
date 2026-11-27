import { ambience } from './ambience'
import { engine } from './engine'
import { playEffect } from './play'
import { radio } from './radio'
import { reentrySound } from './reentry'

export { startAudioSession } from './session'
export { radio }
export type { EffectName } from './effects'

/** The audio facade. Every call is safe with no audio context. */
export const audio = {
  /** Create and resume the context. Call inside a user gesture. */
  unlock: engine.unlock,
  loaded: engine.loaded,
  playing: engine.playing,
  radioQueue: radio.ids,
  play: playEffect,
  setScene: ambience.setScene,
  setReentry: reentrySound.set,
  stopReentry: reentrySound.stop,
  stopAll: engine.stopAll,
}

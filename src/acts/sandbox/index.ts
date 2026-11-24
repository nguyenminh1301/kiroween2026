import type { Act_Module } from '../../engine/actLoader'
import { startSandbox } from './runtime'
import { Scene } from './scene'

/** Dev-only act. Loadable only with ?debug. */
export const act: Act_Module = {
  id: 'sandbox',
  checkpoints: ['start'],
  Scene,
  start() {
    startSandbox()
  },
}

export default act

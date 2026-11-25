import { CHAPTER_INTROS } from '../../content/chapters'
import type { Act_Module } from '../../engine/actLoader'
import { CHECKPOINTS } from './layout'
import { startAct4 } from './runtime'
import { Scene } from './scene'

export const act: Act_Module = {
  id: 'act4-moon',
  checkpoints: [...CHECKPOINTS],
  intro: CHAPTER_INTROS['act4-moon'],
  Scene,
  start(checkpoint) {
    startAct4(checkpoint)
  },
}

export default act

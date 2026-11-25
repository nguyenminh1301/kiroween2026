import { CHAPTER_INTROS } from '../../content/chapters'
import type { Act_Module } from '../../engine/actLoader'
import { CHECKPOINTS } from './layout'
import { startAct3 } from './runtime'
import { Scene } from './scene'

export const act: Act_Module = {
  id: 'act3-farside',
  checkpoints: [...CHECKPOINTS],
  intro: CHAPTER_INTROS['act3-farside'],
  Scene,
  start(checkpoint) {
    startAct3(checkpoint)
  },
}

export default act

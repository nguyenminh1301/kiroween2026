import { CHAPTER_INTROS } from '../../content/chapters'
import type { Act_Module } from '../../engine/actLoader'
import { startAct5 } from './runtime'
import { Scene } from './scene'

export const act: Act_Module = {
  id: 'act5-home',
  checkpoints: ['start'],
  intro: CHAPTER_INTROS['act5-home'],
  Scene,
  start() {
    startAct5()
  },
}

export default act

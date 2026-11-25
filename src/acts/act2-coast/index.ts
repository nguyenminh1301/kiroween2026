import { CHAPTER_INTROS } from '../../content/chapters'
import type { Act_Module } from '../../engine/actLoader'
import { startAct2 } from './runtime'
import { Scene } from './scene'

export const act: Act_Module = {
  id: 'act2-coast',
  checkpoints: ['start'],
  intro: CHAPTER_INTROS['act2-coast'],
  Scene,
  start() {
    startAct2()
  },
}

export default act

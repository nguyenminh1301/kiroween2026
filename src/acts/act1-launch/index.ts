import { CHAPTER_INTROS } from '../../content/chapters'
import type { Act_Module } from '../../engine/actLoader'
import { startAct1 } from './runtime'
import { Scene } from './scene'

export const act: Act_Module = {
  id: 'act1-launch',
  checkpoints: ['start'],
  intro: CHAPTER_INTROS['act1-launch'],
  Scene,
  start() {
    startAct1()
  },
}

export default act

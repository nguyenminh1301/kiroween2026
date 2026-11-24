import { CHAPTER_INTROS } from '../../content/chapters'
import type { Act_Module } from '../../engine/actLoader'
import { startAct0 } from './runtime'
import { Scene } from './scene'

export const act: Act_Module = {
  id: 'act0-pad',
  checkpoints: ['start'],
  intro: CHAPTER_INTROS['act0-pad'],
  Scene,
  start() {
    startAct0()
  },
}

export default act

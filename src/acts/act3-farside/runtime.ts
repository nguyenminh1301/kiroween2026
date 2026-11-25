import { startAudioSession } from '../../audio'
import { createMonster } from '../../director/monster'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { createBody } from '../../engine/playerBody'
import { setPlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { gameStore } from '../../engine/store'
import { registerHandrail } from '../../interaction/interactables'
import { CHECKPOINT_DEFS, collisionBoxes, rails, type Checkpoint } from './layout'
import { act3State, resetAct3State } from './state'

export function startAct3(checkpoint: string): void {
  const def = CHECKPOINT_DEFS[(checkpoint as Checkpoint) in CHECKPOINT_DEFS ? (checkpoint as Checkpoint) : 'start']
  resetAct3State()
  setPlayerBody(createBody({ pos: { ...def.pos }, yaw: def.yaw, pitch: 0, mode: 'zeroG' }))
  gameStore.getState().setMoveMode('zeroG')
  cleanupRegistry.register(() => setPlayerBody(null))
  addPlayerSystem({ boxes: collisionBoxes(), seatForwardYaw: 0 })
  startAudioSession()
  for (const r of rails()) registerHandrail({ id: `act3:${r.id}`, a: r.a, b: r.b })
  act3State.monster = createMonster(def.patrolS)
  act3State.creatureVisible = true
}

import { createBody } from '../../engine/playerBody'
import { setPlayerBody, getPlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { BODY_POS, START_PITCH } from './layout'
import { resetAct1State } from './state'

export function startAct1(): void {
  resetAct1State()
  setPlayerBody(createBody({ pos: { ...BODY_POS }, yaw: 0, pitch: START_PITCH, mode: 'seated' }))
  gameStore.getState().setMoveMode('seated')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  cleanupRegistry.register(() => {
    focus.setBodyAccess(null)
    setPlayerBody(null)
  })
  addPlayerSystem({ boxes: [], seatForwardYaw: 0 })
}

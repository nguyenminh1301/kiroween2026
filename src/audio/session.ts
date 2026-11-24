import { cleanupRegistry } from '../engine/cleanupRegistry'
import { eyePosition } from '../engine/playerBody'
import { getPlayerBody } from '../engine/playerRuntime'
import { addSystem } from '../engine/registerHelpers'
import { gameStore } from '../engine/store'
import { ambience } from './ambience'
import { engine } from './engine'
import { radio } from './radio'

const AUDIO_PRIORITY = 800

/**
 * Call from an act's start. Registers the audio frame system (radio timing on game time,
 * ambience, listener) and a cleanup that stops everything the act started on unload.
 */
export function startAudioSession(): void {
  addSystem(
    'audio',
    AUDIO_PRIORITY,
    (dt) => {
      radio.tick(dt)
      ambience.tick(dt)
      const body = getPlayerBody()
      if (body) engine.setListener(eyePosition(body), body.yaw, body.pitch)
    },
    { pausable: true },
  )
  let paused = gameStore.getState().paused
  const unsub = gameStore.subscribe((s) => {
    if (s.paused === paused) return
    paused = s.paused
    if (paused) radio.pauseAudio()
    else radio.resumeAudio()
  })
  cleanupRegistry.register(() => {
    unsub()
    radio.clear()
    engine.stopAll()
    const s = gameStore.getState()
    s.setTension('CALM')
    s.setHeartRate(72)
    s.setHoldingBreath(false)
    s.setSubtitle(null)
  })
}

// Sandbox start-up: creates the player body and registers every system and listener
// through the cleanup helpers, so unloading removes them. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { TENSION_ORDER } from '../../audio/tension'
import { addSandboxInstance, setSandboxInfo } from '../../engine/debugInfo'
import { inputState } from '../../engine/inputRuntime'
import { createBody, eyePosition } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody, updatePlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { addListener, addSystem, type ListenerTarget } from '../../engine/registerHelpers'
import { gameStore } from '../../engine/store'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { focus } from '../../interaction/Focus'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { canStartTestTimeline, isInsideZone, nextMoveMode } from './logic'
import {
  COLLISION_BOXES,
  groundHeight,
  KNOCK_POS,
  NORTH_WALL,
  PLAYER_START,
  SEAT_EXIT_POS,
  SEAT_FORWARD_YAW,
  SEAT_POS,
  SEAT_USE_DISTANCE,
  ZERO_G_ZONE,
} from './room'
import { createTestTimelineDef } from './testTimeline'

const SEAT_PRIORITY = 40
const ZONE_PRIORITY = 50

let testTimeline: TimelinePlayer | null = null
let testEventCount = 0

export function startSandbox(): void {
  setPlayerBody(createBody({ pos: { ...PLAYER_START }, mode: 'walk' }))
  gameStore.getState().setMoveMode('walk')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  addSandboxInstance(1)
  setSandboxInfo({
    wall: NORTH_WALL,
    wallInnerZ: NORTH_WALL.max.z,
    zeroGZone: ZERO_G_ZONE,
    testTimelineTime: () => testTimeline?.time() ?? null,
  })
  cleanupRegistry.register(() => {
    focus.setBodyAccess(null)
    setSandboxInfo(null)
    addSandboxInstance(-1)
    setPlayerBody(null)
    testTimeline = null
  })

  addPlayerSystem({ boxes: COLLISION_BOXES, ground: groundHeight, seatForwardYaw: SEAT_FORWARD_YAW })

  // E near the seat sits down, E again stands up.
  addSystem(
    'sandbox-seat',
    SEAT_PRIORITY,
    () => {
      const body = getPlayerBody()
      if (!body || !inputState.pressed.use) return
      if (body.mode === 'seated') {
        updatePlayerBody({ pos: { ...SEAT_EXIT_POS }, mode: 'walk' })
        return
      }
      if (body.mode !== 'walk') return
      const d = Math.hypot(body.pos.x - SEAT_POS.x, body.pos.z - SEAT_POS.z)
      if (d <= SEAT_USE_DISTANCE) updatePlayerBody({ pos: { ...SEAT_POS }, yaw: SEAT_FORWARD_YAW, mode: 'seated' })
    },
    { pausable: true },
  )

  // Zero-g while the eye is inside the zone, walk again outside.
  addSystem(
    'sandbox-zone',
    ZONE_PRIORITY,
    () => {
      const body = getPlayerBody()
      if (!body) return
      const store = gameStore.getState()
      const next = nextMoveMode(store.moveMode, isInsideZone(eyePosition(body), ZERO_G_ZONE))
      if (next !== store.moveMode) store.setMoveMode(next)
    },
    { pausable: true },
  )

  // Audio sandbox: the first click or key press unlocks audio. Keys 1 to 5 try the radio, a positional knock and tension.
  startAudioSession()
  audio.setScene({ bed: 'ship', breath: true })
  const unlock = (): void => audio.unlock()
  addListener(window as unknown as ListenerTarget, 'pointerdown', unlock as (ev: never) => void)
  addListener(window as unknown as ListenerTarget, 'keydown', ((e: KeyboardEvent) => {
    audio.unlock()
    if (e.repeat) return
    switch (e.code) {
      case 'Digit1':
        void radio.say('test.capcom')
        break
      case 'Digit2':
        void radio.say('test.los')
        break
      case 'Digit3':
        void radio.say('act0.intro1')
        break
      case 'Digit4':
        audio.play('knock', { position: KNOCK_POS })
        break
      case 'Digit5': {
        const s = gameStore.getState()
        const i = TENSION_ORDER.indexOf(s.tension)
        s.setTension(TENSION_ORDER[(i + 1) % TENSION_ORDER.length])
        break
      }
    }
  }) as (ev: never) => void)

  addListener(window as unknown as ListenerTarget, 'keydown', ((e: KeyboardEvent) => {
    if (e.code !== 'KeyT' || e.repeat) return
    if (gameStore.getState().paused) return
    if (!canStartTestTimeline(testTimeline)) return
    testTimeline = new TimelinePlayer(createTestTimelineDef(() => {
      testEventCount++
    })).start()
  }) as (ev: never) => void)
}

/** How many times the test Timeline event has run. For manual checks. */
export function getTestEventCount(): number {
  return testEventCount
}

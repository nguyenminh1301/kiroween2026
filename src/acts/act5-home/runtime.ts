// Act 5 start-up: seated in the cabin, one 72 s timeline of outside shots, then the Archive.
// Everything goes through cleanup helpers, so unloading removes it. No Three.js or React imports.
import { audio, radio, startAudioSession } from '../../audio'
import { completeAct } from '../../engine/actFlow'
import { cleanupRegistry } from '../../engine/cleanupRegistry'
import { fxStore } from '../../engine/fx'
import { createBody } from '../../engine/playerBody'
import { getPlayerBody, setPlayerBody } from '../../engine/playerRuntime'
import { addPlayerSystem } from '../../engine/playerSystem'
import { gameStore } from '../../engine/store'
import { focus } from '../../interaction/Focus'
import { cabinState } from '../../procgen/cabin/cabinState'
import { BODY_POS, START_PITCH } from '../../procgen/cabin/layout'
import { TimelinePlayer } from '../../timeline/TimelinePlayer'
import { act5State, resetAct5State } from './state'
import { DURATION, events, fadeLevel, heat, heliLevel, oceanLevel, SHAKE, SHOTS, SKY, viewAt } from './timeline'

export function startAct5(): void {
  resetAct5State()
  cabinState.sky = SKY.space
  cabinState.earth = true
  setPlayerBody(createBody({ pos: { ...BODY_POS }, yaw: 0, pitch: START_PITCH, mode: 'seated' }))
  const store = gameStore.getState()
  store.setMoveMode('seated')
  focus.setBodyAccess({ get: getPlayerBody, set: setPlayerBody })
  let alive = true
  cleanupRegistry.register(() => {
    alive = false
    focus.setBodyAccess(null)
    setPlayerBody(null)
    const s = gameStore.getState()
    s.setFear(0)
    s.setTension('CALM')
    fxStore.getState().setBlackout(0)
  })

  addPlayerSystem({ boxes: [], seatForwardYaw: 0 })
  startAudioSession()
  let ocean = 0
  let heli = 0
  const setAmbience = (): void => audio.setScene({ hum: 0.5, bed: 'ship', breath: true, ocean, heli })
  setAmbience()
  store.setFear(0.2)
  store.setHeartRate(100)
  store.setTension('UNEASE')

  const player = new TimelinePlayer({
    duration: DURATION,
    shots: SHOTS,
    shake: SHAKE,
    events: events({
      say(id, opts) {
        void radio.say(id, { onStart: opts?.focus ? () => alive && focus.focusOn(opts.focus!, 1.5) : undefined })
      },
      playSound: (n) => audio.play(n),
      setSky: (c) => {
        cabinState.sky = c
      },
      hideEarth: () => {
        cabinState.earth = false
      },
      fadeOut: () => {},
      complete: () => completeAct(),
    }),
    onTick(t) {
      const view = viewAt(t)
      act5State.t = t
      act5State.view = view
      const h = heat(t)
      act5State.heat = h
      cabinState.engine = h
      fxStore.getState().setBlackout(fadeLevel(t))
      const outside = view !== 'cabin'
      const o = oceanLevel(t, outside)
      const hl = heliLevel(t, outside)
      if (Math.abs(o - ocean) > 0.01 || Math.abs(hl - heli) > 0.01) {
        ocean = o
        heli = hl
        setAmbience()
      }
    },
  })
  player.start()
  act5State.started = true
}

// The per-frame interaction system: target pick, use, handrail push-off, sightings, wrist.
// Started once from boot.
import { audio } from '../audio'
import { fxStore } from '../engine/fx'
import { registerSystem } from '../engine/frameDriver'
import { inputState } from '../engine/inputRuntime'
import { eyePosition } from '../engine/playerBody'
import { getPlayerBody, launchPlayer } from '../engine/playerRuntime'
import { gameStore, type Target } from '../engine/store'
import type { Vec3 } from '../types'
import { showHint } from '../ui/hints'
import { focus } from './Focus'
import { isHandrailUsable, resolveUse } from './handrail'
import { getHandrails, getInteractables, getSightingTracker } from './interactables'
import { nearestOnSegment, pickTarget, viewDirection } from './targeting'

/** After the player (100), before Focus (200). */
export const INTERACTION_PRIORITY = 150

function sameTarget(a: Target | null, b: Target | null): boolean {
  return a === b || (!!a && !!b && a.id === b.id && a.verb === b.verb)
}

function railInReach(eye: Vec3): boolean {
  return getHandrails().some((r) => isHandrailUsable(eye, nearestOnSegment(eye, r.a, r.b)))
}

const pushListeners = new Set<() => void>()

/** Called after each handrail push-off. Returns a remover. */
export function onHandrailPush(l: () => void): () => void {
  pushListeners.add(l)
  return () => {
    pushListeners.delete(l)
  }
}

let stop: (() => void) | null = null

export function startInteraction(): () => void {
  if (stop) return stop
  const remove = registerSystem(
    'interaction',
    INTERACTION_PRIORITY,
    (dt) => {
      const store = gameStore.getState()
      const body = getPlayerBody()
      if (!body) {
        if (store.target) store.setTarget(null)
        return
      }
      const eye = eyePosition(body)
      const dir = viewDirection(body.yaw, body.pitch)

      for (const id of getSightingTracker().update(dt, eye, dir)) store.addAnomalySeen(id)

      const picked = pickTarget(eye, dir, getInteractables())
      const rail = !picked && store.moveMode === 'zeroG' && railInReach(eye)
      const next: Target | null = picked
        ? { id: picked.id, verb: picked.verb }
        : rail
          ? { id: 'handrail', verb: 'PULL' }
          : null
      if (!sameTarget(store.target, next)) store.setTarget(next)

      fxStore.getState().setWrist(inputState.held.wrist)

      if (!inputState.pressed.use) return
      const action = resolveUse(!!picked, rail, focus.isFocusActive())
      if (action === 'use') picked?.use()
      else if (action === 'push') {
        launchPlayer(dir)
        audio.play('grab')
        showHint('push')
        for (const l of [...pushListeners]) l()
      }
    },
    { pausable: true },
  )
  stop = () => {
    remove()
    stop = null
  }
  return stop
}

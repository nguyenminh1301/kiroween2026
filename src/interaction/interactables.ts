// Registries for interactables, handrails and anomaly sightings. Acts register through
// these, and each registration is removed again when the act unloads.
// No React or Three.js imports.
import type { Verb } from '../content/verbs'
import { cleanupRegistry } from '../engine/cleanupRegistry'
import type { Vec3 } from '../types'
import { createSightingTracker, type Sighting } from './sighting'
import type { Pickable } from './targeting'

export interface Interactable extends Pickable {
  verb: Verb
  use(): void
}

export interface Handrail {
  id: string
  a: Vec3
  b: Vec3
}

let items: Interactable[] = []
let rails: Handrail[] = []
let version = 0
const listeners = new Set<() => void>()
const tracker = createSightingTracker()

function bump(): void {
  version++
  for (const l of [...listeners]) l()
}

function removable<T>(list: () => T[], set: (next: T[]) => void, item: T): () => void {
  let done = false
  const remove = (): void => {
    if (done) return
    done = true
    set(list().filter((x) => x !== item))
    bump()
  }
  cleanupRegistry.register(remove)
  return remove
}

export function registerInteractable(item: Interactable): () => void {
  items = [...items, item]
  bump()
  return removable(() => items, (n) => (items = n), item)
}

export function registerHandrail(rail: Handrail): () => void {
  rails = [...rails, rail]
  return removable(() => rails, (n) => (rails = n), rail)
}

export function registerSighting(s: Sighting): () => void {
  const remove = tracker.add(s)
  cleanupRegistry.register(remove)
  return remove
}

export const getInteractables = (): readonly Interactable[] => items
export const getHandrails = (): readonly Handrail[] => rails
export const getSightingTracker = () => tracker
export const getInteractablesVersion = (): number => version

export function subscribeInteractables(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

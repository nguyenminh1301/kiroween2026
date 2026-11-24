// Named head anchors, so a dialogue line can turn the player's view toward a speaker.
// No Three.js or React imports.
import { cleanupRegistry } from '../engine/cleanupRegistry'
import type { Vec3 } from '../types'

const anchors = new Map<string, () => Vec3>()
const lastSeen = new Map<string, Vec3>()

/** Register a head anchor. Returns a remover. The act unloading removes it too. */
export function registerHeadAnchor(name: string, get: () => Vec3): () => void {
  anchors.set(name, get)
  let done = false
  const remove = (): void => {
    if (done) return
    done = true
    if (anchors.get(name) === get) anchors.delete(name)
    lastSeen.delete(name)
  }
  cleanupRegistry.register(remove)
  return remove
}

/** A function for `focusOn`: the current head position of `name`, or its last known position. */
export function headOf(name: string): () => Vec3 {
  return () => {
    const get = anchors.get(name)
    if (get) {
      const v = get()
      lastSeen.set(name, v)
      return v
    }
    return lastSeen.get(name) ?? { x: 0, y: 1.7, z: 0 }
  }
}

export function hasHeadAnchor(name: string): boolean {
  return anchors.has(name)
}
